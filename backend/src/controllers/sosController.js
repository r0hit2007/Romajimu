const sosService = require('../services/sosService');
const { success } = require('../utils/response');

class SosController {
  async getSettings(req, res, next) {
    try {
      const settings = await sosService.getSettings(req.user.id);
      return success(res, settings, 'Settings retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const settings = await sosService.updateSettings(req.user.id, req.body);
      return success(res, settings, 'Settings updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async recordSosAlert(req, res, next) {
    try {
      const alert = await sosService.recordSosAlert(req.user.id, req.body);
      return success(res, alert, 'Emergency alert logged in history', 201);
    } catch (err) {
      next(err);
    }
  }

  async getSosHistory(req, res, next) {
    try {
      const history = await sosService.getSosHistory(req.user.id);
      return success(res, history, 'SOS history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async syncOfflineQueue(req, res, next) {
    try {
      const synced = await sosService.syncOfflineQueue(req.user.id, req.body.queue);
      return success(res, synced, `Synced ${synced.length} emergency alerts from offline queue`);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SosController();
