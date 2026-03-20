const db = require('../config/db');
const { sendError } = require('../utils/response');

const verifyAdmin = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return sendError(res, 'Authentication problem — user not found in token.', 401, 'UNAUTHORIZED');
    }

    const [rows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return sendError(res, 'Authentication problem — User not found.', 401, 'UNAUTHORIZED');
    }

    const role = (rows[0].role || '').toLowerCase();
    if (role !== 'admin') {
      return sendError(res, 'Admin access required.', 403, 'FORBIDDEN');
    }

    next();
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = verifyAdmin;
