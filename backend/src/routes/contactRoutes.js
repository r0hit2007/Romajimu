const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authenticate = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { contactSchema } = require('../utils/validation');

// All contact routes require authentication
router.use(authenticate);

router.get('/', contactController.getContacts);
router.post('/', validate(contactSchema), contactController.addContact);
router.put('/:id', validate(contactSchema), contactController.updateContact);
router.delete('/:id', contactController.deleteContact);
router.patch('/:id/toggle-sos', contactController.toggleSos);
router.post('/sync', contactController.syncContacts);

module.exports = router;
