const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticate = require('../middleware/authMiddleware');

router.post('/draft-message', authenticate, aiController.draftMessage);
router.get('/safety-tips', aiController.getSafetyTips);

module.exports = router;
