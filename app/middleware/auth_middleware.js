// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only allow access tokens for protected routes
    if (decoded.type !== 'access') {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — Refresh token cannot be used to access resources. ' });
    }

    // check token_version in DB to ensure token wasn't invalidated
    if (!decoded.id) {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — Invalid token payload.' });
    }

    const [rows] = await db.query('SELECT token_version FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — User not found.' });
    }

    const dbVersion = rows[0].token_version || 0;
    if ((decoded.token_version || 0) !== dbVersion) {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — Token invalidated. Please login again.' });
    }

    req.user = decoded; // store decoded info in request
    next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — Token expired.' });
    }
    return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — Token invalid or tampered.' });
  }
};

module.exports = verifyToken;
