const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const authenticate = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { settingsSchema, sosHistorySchema } = require('../utils/validation');

router.use(authenticate);

// Settings
router.get('/settings', sosController.getSettings);
router.put('/settings', validate(settingsSchema), sosController.updateSettings);

// SOS Emergency Alert Operations
router.post('/alert', validate(sosHistorySchema), sosController.recordSosAlert);
router.get('/history', sosController.getSosHistory);
router.post('/sync-queue', sosController.syncOfflineQueue);

module.exports = router;
