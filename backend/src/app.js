const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { error } = require('./utils/response');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Request parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Silent SOS API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// 404 Not Found handler
app.use((req, res) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
