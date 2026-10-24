const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

// Support resources are public to allow safe access anytime
router.get('/', resourceController.getByRegion);
router.get('/all', resourceController.getAll);

module.exports = router;
