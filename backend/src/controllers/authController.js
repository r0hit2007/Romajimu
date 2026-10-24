const authService = require('../services/authService');
const { success } = require('../utils/response');

class AuthController {
  async signup(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.signup({
        name,
        email,
        password,
        ipAddress,
        userAgent,
      });

      return success(res, result, 'Account created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login({
        email,
        password,
        ipAddress,
        userAgent,
      });

      return success(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      return success(res, result, 'Token refreshed successfully');
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email, newPassword } = req.body;
      const result = await authService.forgotPassword({ email, newPassword });
      return success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.id);
      return success(res, profile, 'Profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
