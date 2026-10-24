const contactService = require('../services/contactService');
const { success } = require('../utils/response');

class ContactController {
  async getContacts(req, res, next) {
    try {
      const contacts = await contactService.getContacts(req.user.id);
      return success(res, contacts, 'Contacts retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async addContact(req, res, next) {
    try {
      const contact = await contactService.addContact(req.user.id, req.body);
      return success(res, contact, 'Contact added successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateContact(req, res, next) {
    try {
      const contact = await contactService.updateContact(req.user.id, req.params.id, req.body);
      return success(res, contact, 'Contact updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteContact(req, res, next) {
    try {
      await contactService.deleteContact(req.user.id, req.params.id);
      return success(res, null, 'Contact deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async toggleSos(req, res, next) {
    try {
      const contact = await contactService.toggleSos(req.user.id, req.params.id);
      return success(res, contact, 'SOS status updated');
    } catch (err) {
      next(err);
    }
  }

  async syncContacts(req, res, next) {
    try {
      const contacts = await contactService.syncContacts(req.user.id, req.body.contacts);
      return success(res, contacts, 'Contacts synced successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ContactController();
