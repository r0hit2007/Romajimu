const { error } = require('../utils/response');
const env = require('../config/env');

/**
 * Centralized express error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Prisma unique constraint error (P2002)
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return error(res, `A record with this ${target} already exists.`, 409);
  }

  // Prisma record not found error (P2025)
  if (err.code === 'P2025') {
    return error(res, 'The requested resource was not found.', 404);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return error(
    res,
    message,
    statusCode,
    env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};

module.exports = errorHandler;
