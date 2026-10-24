const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/**
 * Authentication middleware to verify JWT access tokens
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required. Missing Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, email, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired. Please refresh your session.', 401, { code: 'TOKEN_EXPIRED' });
    }
    return error(res, 'Invalid authentication token.', 401, { code: 'INVALID_TOKEN' });
  }
};

module.exports = authenticate;
