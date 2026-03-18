const db = require('../config/db');

const verifyAdmin = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — user not found in token.' });
    }

    const [rows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem — User not found.' });
    }

    const role = (rows[0].role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ code: 'Forbidden', message: 'Admin access required.' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
};

module.exports = verifyAdmin;
