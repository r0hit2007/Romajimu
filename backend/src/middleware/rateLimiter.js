const rateLimit = require('express-rate-limit');
const { error } = require('../utils/response');

const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return error(res, message, 429, { retryAfter: Math.ceil(windowMs / 1000) });
    },
  });
};

// 20 requests per 15 minutes for sensitive auth endpoints
const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  'Too many login/signup attempts. Please try again in 15 minutes.'
);

// 300 requests per 15 minutes for standard API calls
const apiLimiter = createLimiter(
  15 * 60 * 1000,
  300,
  'API rate limit exceeded. Please throttle requests.'
);

module.exports = {
  authLimiter,
  apiLimiter,
};
