const logger = require('../config/logger');
const { sendError } = require('../utils/responseHandler');
const ERROR_CODES = require('../constants/errorCodes');

const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || ERROR_CODES.ERR_INTERNAL_SERVER;
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Log error with Winston
  logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${message}`, {
    stack: err.stack,
    errorCode,
    details
  });

  // Handle Multer specific errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = ERROR_CODES.ERR_FILE_UPLOAD;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum allowed limit of 5MB';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = ERROR_CODES.ERR_BAD_REQUEST;
    message = `Invalid format for field: ${err.path}`;
  }

  return sendError(res, statusCode, errorCode, message, details);
};

module.exports = globalErrorHandler;
