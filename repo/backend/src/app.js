const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const paymentController = require('./controllers/paymentController');
const globalErrorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const ERROR_CODES = require('./constants/errorCodes');

const app = express();

// Trust reverse proxy hops early in app setup (never boolean true)
app.set('trust proxy', env.trustProxyHops);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration
// Accept CLIENT_URL as one origin or a comma-separated list, normalize trailing slashes, and never allow wildcard in production
const rawClientUrls = env.clientUrl ? env.clientUrl.split(',') : [];
const normalizedOrigins = rawClientUrls
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter((url) => url.length > 0);

const safeOrigins =
  env.nodeEnv === 'production'
    ? normalizedOrigins.filter((origin) => origin !== '*')
    : (normalizedOrigins.length > 0 ? normalizedOrigins : ['http://localhost:5173']);

const allowedOrigins =
  env.nodeEnv === 'production'
    ? safeOrigins
    : Array.from(new Set([...safeOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173']));

const corsOptions = {
  origin: (origin, callback) => {
    // Requests with no Origin header (server-to-server, Razorpay webhooks, health checks, curl) must still work
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));

// Razorpay Webhook mounted BEFORE express.json() to preserve raw body for HMAC signature verification
app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Body parsers & mongo sanitization against injection
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// HTTP request logging via Morgan -> Winston stream
const morganStream = {
  write: (message) => logger.info(message.trim())
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Static uploads route (for local fallback storage mode)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/v1', routes);

// Health check endpoint (unauthenticated, excludes secrets and config, returns 503 when database is disconnected)
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.status(503).json({
      status: 'DOWN',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'UP',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// 404 Route Handler
app.use('*', (req, res, next) => {
  next(
    new AppError(
      `Cannot find endpoint ${req.originalUrl} on this server`,
      404,
      ERROR_CODES.ERR_PRODUCT_NOT_FOUND
    )
  );
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

module.exports = app;
