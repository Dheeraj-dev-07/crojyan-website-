const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');

const protectAdmin = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('Authentication token missing. Please log in.', 401, ERROR_CODES.ERR_UNAUTHORIZED)
    );
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.role !== 'ADMIN') {
      return next(
        new AppError('Access forbidden. Admin role required.', 403, ERROR_CODES.ERR_FORBIDDEN)
      );
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return next(
      new AppError('Invalid or expired authentication token', 401, ERROR_CODES.ERR_UNAUTHORIZED)
    );
  }
};

module.exports = {
  protectAdmin
};
