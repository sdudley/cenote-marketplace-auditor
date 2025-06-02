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

    // Set up basic middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Configure static file serving for client assets
    app.use(express.static(path.join(__dirname, '../../../dist/client')));

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

        // Start the server
        app.listen(port, () => {
            console.log(`Express server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

startServer();
