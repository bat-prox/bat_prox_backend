const { getDashboardData } = require('../services/dashboard.service');
const { sendSuccess, sendError } = require('../utils/response');

const getDashboard = async (req, res) => {
  try {
    const data = await getDashboardData();
    return sendSuccess(res, 'Dashboard data fetched successfully', data, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = { getDashboard };
