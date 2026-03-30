// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendError } = require('../utils/response');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return sendError(res, 'Authentication problem — Token missing.', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only allow access tokens for protected routes
    if (decoded.type !== 'access') {
      return sendError(res, 'Authentication problem — Refresh token cannot be used to access resources.', 401, 'UNAUTHORIZED');
    }

    // check token_version in DB to ensure token wasn't invalidated
    if (!decoded.id) {
      return sendError(res, 'Authentication problem — Invalid token payload.', 401, 'UNAUTHORIZED');
    }

    const [rows] = await db.query('SELECT token_version, IFNULL(is_deleted, 0) AS is_deleted FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return sendError(res, 'Authentication problem — User not found.', 401, 'UNAUTHORIZED');
    }

    if (Number(rows[0].is_deleted || 0) === 1) {
      return sendError(res, 'Your account has been deleted. Contact support.', 401, 'UNAUTHORIZED');
    }

    const dbVersion = rows[0].token_version || 0;
    if ((decoded.token_version || 0) !== dbVersion) {
      return sendError(res, 'Authentication problem — Token invalidated. Please login again.', 401, 'UNAUTHORIZED');
    }

    req.user = decoded; // store decoded info in request
    next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication problem — Token expired.', 401, 'UNAUTHORIZED');
    }
    return sendError(res, 'Authentication problem — Token invalid or tampered.', 401, 'UNAUTHORIZED');
  }
};

module.exports = verifyToken;
