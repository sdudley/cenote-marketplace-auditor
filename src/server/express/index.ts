import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { configureContainer } from './config/container';
import { ApiRouter } from './routes/api';
import { initializeDatabase } from '../config/database';

async function startServer() {
    // Create Express application
    const app = express();
    const port = process.env.PORT || 3000;
    const clientDistPath = path.join(__dirname, '../../../dist/client');

    // Set up basic middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Configure static file serving for client assets with caching
    app.use(express.static(clientDistPath, {
        maxAge: '1y', // Cache static assets for 1 year
        etag: true, // Enable ETag
        lastModified: true, // Enable Last-Modified
        setHeaders: (res, path) => {
            // Set appropriate MIME types
            if (path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (path.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
            } else if (path.endsWith('.html')) {
                res.setHeader('Content-Type', 'text/html');
            }
        }
    }));

    // Initialize database and configure dependency injection
    try {
        const dataSource = await initializeDatabase();
        const container = configureContainer(dataSource);

        // Set up API routes
        const apiRouter = container.get<ApiRouter>('ApiRouter');
        app.use('/api', apiRouter.router);

        // Set up error handling middleware
        app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });

        // SPA fallback route - must be after API routes
        app.get('*', (req, res, next) => {
            // Don't serve index.html for API routes
            if (req.path.startsWith('/api')) {
                return next();
            }
            res.sendFile(path.join(clientDistPath, 'index.html'));
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Express server is running on port ${port}`);
            console.log(`Serving static files from ${clientDistPath}`);
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

startServer();
