const resourceService = require('../services/resourceService');
const { success } = require('../utils/response');

class ResourceController {
  async getByRegion(req, res, next) {
    try {
      const region = req.query.region || 'US';
      const resources = await resourceService.getResourcesByRegion(region);
      return success(res, resources, `Support resources for region ${region}`);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const resources = await resourceService.getAllResources();
      return success(res, resources, 'All verified support resources');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ResourceController();
