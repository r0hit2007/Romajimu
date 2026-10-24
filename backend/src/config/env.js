require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_key_12345',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_12345',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  HF_TOKEN: process.env.HF_TOKEN || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
