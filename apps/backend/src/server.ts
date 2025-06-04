
import http from 'http';
import app from './app';
import { config } from './config';
import logger from './utils/logger';
import { initSocketIO } from './realtime/socketHandler';
import db from './db/db'; // Import to ensure DB connection is established on start

const PORT = config.PORT || 3001;

const httpServer = http.createServer(app);

// Initialize Socket.IO and attach it to the HTTP server
initSocketIO(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  logger.info(`API available at http://localhost:${PORT}/api`);
  logger.info(`Backend connected to database: ${config.DATABASE_URL}`);
});

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const; // Use "as const" for stronger type on signal strings
signals.forEach(signal => {
  (process as NodeJS.EventEmitter).on(signal, () => { // Cast to NodeJS.EventEmitter which has .on
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed.');
      db.close((err) => {
        if (err) {
          logger.error('Error closing database connection during shutdown:', err.message);
        } else {
          logger.info('Database connection closed.');
        }
        (process as { exit: (code?: number) => void }).exit(0);
      });
    });
  });
});
