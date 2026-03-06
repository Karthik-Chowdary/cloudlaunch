import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import wsManager from './websocket';
import logger from './middleware/logger';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'CloudLaunch',
    version: '1.0.0',
    docs: '/api/health',
    websocket: '/ws',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize WebSocket
wsManager.initialize(server);

// Start server
server.listen(config.port, () => {
  logger.info(`CloudLaunch backend running on port ${config.port}`);
  logger.info(`WebSocket available at ws://localhost:${config.port}/ws`);
  logger.info(`API available at http://localhost:${config.port}/api`);
});

export { app, server };
