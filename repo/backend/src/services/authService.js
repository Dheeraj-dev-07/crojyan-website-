const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const env = require('../config/env');

/*
 * NOTE REGARDING JWT AUTHENTICATION STRATEGY:
 * Single-admin MVP uses a 7-day signed JWT access token.
 * Refresh-token rotation is explicitly out of scope for this MVP stage
 * — this is a deliberate architecture tradeoff, not an oversight.
 */

const loginAdmin = async (email, password) => {
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) {
    throw new AppError('Invalid email or password', 401, ERROR_CODES.ERR_UNAUTHORIZED);
  }

  const isPasswordMatch = await admin.comparePassword(password);
  if (!isPasswordMatch) {
    admin.failedLoginAttempts += 1;
    await admin.save();
    throw new AppError('Invalid email or password', 401, ERROR_CODES.ERR_UNAUTHORIZED);
  }

  // Reset failed login attempts on successful login
  admin.failedLoginAttempts = 0;
  admin.lastLoginAt = new Date();
  await admin.save();

  const token = jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return {
    token,
    admin: {
      id: admin._id,
      email: admin.email,
      role: admin.role
    }
  };
};

const getAdminProfile = async (adminId) => {
  const admin = await Admin.findById(adminId).select('-password');
  if (!admin) {
    throw new AppError('Admin account not found', 404, ERROR_CODES.ERR_UNAUTHORIZED);
  }
  return admin;
};

module.exports = {
  loginAdmin,
  getAdminProfile
};
