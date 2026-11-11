const { getDashboardData } = require('../services/dashboardService');

async function getDashboardController(req, res, next) {
  try {
    const dashboard = await getDashboardData(req.organizationId);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardController,
};