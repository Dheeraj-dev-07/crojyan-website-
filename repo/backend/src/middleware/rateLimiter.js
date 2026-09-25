const rateLimit = require('express-rate-limit');
const ERROR_CODES = require('../constants/errorCodes');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
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

module.exports = {
  loginRateLimiter
};
