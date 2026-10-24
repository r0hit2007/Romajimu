const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const contactRoutes = require('./contactRoutes');
const sosRoutes = require('./sosRoutes');
const resourceRoutes = require('./resourceRoutes');
const aiRoutes = require('./aiRoutes');
const { apiLimiter } = require('../middleware/rateLimiter');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'silent-sos-backend',
    timestamp: new Date().toISOString(),
  });
});

// Apply rate limiting to all API routes
router.use(apiLimiter);

router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/sos', sosRoutes);
router.use('/resources', resourceRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
