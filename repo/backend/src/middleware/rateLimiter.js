const rateLimit = require('express-rate-limit');
const ERROR_CODES = require('../constants/errorCodes');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.ERR_TOO_MANY_REQUESTS,
        message: 'Too many login attempts. Please try again after 15 minutes.'
      }
    });
  }
});

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.ERR_TOO_MANY_REQUESTS,
        message: 'Too many payment requests. Please try again shortly.'
      }
    });
  }
});

module.exports = {
  loginRateLimiter,
  paymentRateLimiter
};
