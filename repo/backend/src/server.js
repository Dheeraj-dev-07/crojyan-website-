const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`Server running in [${env.nodeEnv}] mode on port ${env.port}`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`UNHANDLED REJECTION! Shutting down... ${err.name}: ${err.message}`, { stack: err.stack });
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error(`UNCAUGHT EXCEPTION! Shutting down... ${err.name}: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
};

startServer();
