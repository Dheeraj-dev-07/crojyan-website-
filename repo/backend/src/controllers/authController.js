const authService = require('../services/authService');
const { sendSuccess } = require('../utils/responseHandler');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginAdmin(email, password);
    return sendSuccess(res, 200, result, null, 'Admin authentication successful');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const admin = await authService.getAdminProfile(adminId);
    return sendSuccess(res, 200, admin, null, 'Admin profile retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe
};
