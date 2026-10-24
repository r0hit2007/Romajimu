const aiService = require('../services/aiService');
const { success } = require('../utils/response');

class AIController {
  async draftMessage(req, res, next) {
    try {
      const { currentMessage, includeLocation, scenario } = req.body;
      const message = await aiService.draftSosMessage({
        currentMessage,
        includeLocation,
        scenario,
      });
      return success(res, { message }, 'Drafted discreet SOS message');
    } catch (err) {
      next(err);
    }
  }

  async getSafetyTips(req, res, next) {
    try {
      const region = req.query.region || 'US';
      const tips = await aiService.generateSafetyTips(region);
      return success(res, { tips }, 'Safety planning tips retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AIController();
