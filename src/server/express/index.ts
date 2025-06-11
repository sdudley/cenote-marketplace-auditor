import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { configureContainer } from './config/container';
import { ApiRouter } from './routes/api';
import { initializeDatabase } from '../config/database';
import { createServer, ViteDevServer } from 'vite';
import fs from 'fs';
import { resolveModulePath } from './ModuleResolver';
import { EXPRESS_TYPES } from './config/expressTypes';
import { JobDao } from '#server/database/JobDao';
import { TYPES } from '#server/config/types';
import { SchedulerService } from '../services/SchedulerService';

// Optionally, patch require to use the resolver for #common
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (importPath: any) {
  if (typeof importPath === 'string' && importPath.startsWith('#common')) {
    const resolved = resolveModulePath(importPath);
    return originalRequire.call(this, resolved);
  }
  return originalRequire.call(this, importPath);
};

async function startServer() {
    console.log('Starting development server...');
    console.log('Initializing database and configuring server...');

    // Create Express application
    const app = express();
    const port = process.env.PORT || 3000;
    const clientDistPath = path.join(process.cwd(), 'dist/client');
    const isDev = process.env.NODE_ENV !== 'production';
    let vite: ViteDevServer | undefined;

    // Set up basic middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize database and configure dependency injection
    try {
        const dataSource = await initializeDatabase();
        const container = configureContainer(dataSource);

        const jobDao = container.get<JobDao>(TYPES.JobDao);
        await jobDao.recordApplicationStart();

        // Initialize scheduler
        const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
        await schedulerService.initialize();

        // Set up API routes
        const apiRouter = container.get<ApiRouter>(EXPRESS_TYPES.ApiRouter);
        app.use('/api', apiRouter.router);

        if (isDev) {
            console.log('Starting Vite development server...');
            // Create Vite server in middleware mode
            vite = await createServer({
                server: { middlewareMode: true },
                appType: 'custom',
                root: path.join(process.cwd(), 'src/client'),
            });
            console.log('Vite development server is ready!');

            // Use vite's connect instance as middleware
            app.use(vite.middlewares);

            // Serve index.html for all routes in development
            app.use('*', async (req, res, next) => {
                const url = req.originalUrl;

                try {
                    // Read the index.html file
                    let template = fs.readFileSync(
                        path.resolve(process.cwd(), 'src/client/index.html'),
                        'utf-8'
                    );

                    // Apply Vite HTML transforms
                    template = await vite!.transformIndexHtml(url, template);

                    // Send the transformed HTML
                    res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
                } catch (e) {
                    // If an error is caught, let Vite fix the stack trace
                    vite!.ssrFixStacktrace(e as Error);
                    next(e);
                }
            });
        } else {
            // Configure static file serving for client assets with caching in production
            app.use(express.static(clientDistPath, {
                maxAge: '1y',
                etag: true,
                lastModified: true,
                setHeaders: (res, path) => {
                    if (path.endsWith('.js')) {
                        res.setHeader('Content-Type', 'application/javascript');
                    } else if (path.endsWith('.css')) {
                        res.setHeader('Content-Type', 'text/css');
                    } else if (path.endsWith('.html')) {
                        res.setHeader('Content-Type', 'text/html');
                    }
                }
            }));

            // Serve index.html for all routes in production
            app.get('*', (req, res) => {
                res.sendFile(path.join(clientDistPath, 'index.html'));
            });
        }

        // Set up error handling middleware
        app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Express server is running on port ${port}`);
            if (isDev) {
                console.log('Development mode with HMR enabled');
            } else {
                console.log(`Serving static files from ${clientDistPath}`);
            }
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

startServer();
