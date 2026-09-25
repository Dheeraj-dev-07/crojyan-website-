const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginSchema } = require('../validators/authValidator');
const validateRequest = require('../middleware/validateMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login);
router.get('/me', protectAdmin, authController.getMe);

module.exports = router;
