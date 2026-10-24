const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  refreshTokenSchema,
} = require('../utils/validation');

router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
