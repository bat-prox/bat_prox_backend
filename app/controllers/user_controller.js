const bcrypt = require('bcrypt');
const saltRounds = 10;
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/response');

const secretKey = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || secretKey;
const ACCESS_TOKEN_EXPIRES_IN = '90d';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 90 * 24 * 60 * 60;
const REFRESH_TOKEN_EXPIRES_IN = '180d';

const buildExpiryDate = (expiresInSeconds) =>
  new Date(Date.now() + expiresInSeconds * 1000).toISOString();

const signAccessToken = (payload) =>
  jwt.sign(payload, secretKey, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

const signRefreshToken = (payload) =>
  jwt.sign(payload, refreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, 'uploads/');
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, 'uploads/');
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const uploadMedia = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

const hasUsersColumn = async (columnName) => {
  const [rows] = await db.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
};

const sanitizeUser = (user = {}) => {
  const {
    password,
    token_version,
    refresh_token,
    is_Verified,
    role,
    ...safeUser
  } = user;
  return safeUser;
};

const getUser = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 1000);
    const offset = req.query.offset !== undefined
      ? Math.max(0, parseInt(req.query.offset, 10) || 0)
      : (page - 1) * limit;

    const { status, name } = req.query;

    const hasBatproxUsername = await hasUsersColumn('batprox_username');
    const hasBatproxPassword = await hasUsersColumn('batprox_password');
    const hasIsPlayStore = await hasUsersColumn('isPlayStore');
    const hasBalance = await hasUsersColumn('balance');

    const batproxUsernameSelect = hasBatproxUsername ? 'batprox_username' : 'NULL AS batprox_username';
    const batproxPasswordSelect = hasBatproxPassword ? 'batprox_password' : 'NULL AS batprox_password';
    const isPlayStoreSelect = hasIsPlayStore ? 'isPlayStore' : 'NULL AS isPlayStore';
    const balanceSelect = hasBalance ? 'balance' : '0.00 AS balance';

    const conditions = [`COALESCE(role, 'user') <> 'admin'`];
    const filterParams = [];

    if (status !== undefined && status !== '') {
      conditions.push('status = ?');
      filterParams.push(status);
    }

    if (name !== undefined && name.trim() !== '') {
      conditions.push('name LIKE ?');
      filterParams.push(`%${name.trim()}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM users WHERE ${whereClause}`,
      filterParams
    );
    const total = Number(countRows[0].total || 0);

    const [result] = await db.query(
      `SELECT id, name, created_at, status, phone,
              ${batproxUsernameSelect}, ${batproxPasswordSelect}, ${isPlayStoreSelect}, ${balanceSelect}
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    return sendSuccess(
      res,
      'Users fetched successfully',
      {
        page,
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
        items: result
      },
      200
    );
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getAllUsersByAdmin = async (req, res) => {
  try {
    const hasBatproxUsername = await hasUsersColumn('batprox_username');
    const hasBatproxPassword = await hasUsersColumn('batprox_password');
    const hasIsPlayStore = await hasUsersColumn('isPlayStore');
    const hasBalance = await hasUsersColumn('balance');

    const batproxUsernameSelect = hasBatproxUsername ? 'batprox_username' : 'NULL AS batprox_username';
    const batproxPasswordSelect = hasBatproxPassword ? 'batprox_password' : 'NULL AS batprox_password';
    const isPlayStoreSelect = hasIsPlayStore ? 'isPlayStore' : 'NULL AS isPlayStore';
    const balanceSelect = hasBalance ? 'balance' : '0.00 AS balance';

    const [rows] = await db.query(
      `SELECT id, name, created_at, status, phone,
              ${batproxUsernameSelect}, ${batproxPasswordSelect}, ${isPlayStoreSelect}, ${balanceSelect}
       FROM users
       WHERE COALESCE(role, 'user') <> 'admin'
       ORDER BY created_at DESC`
    );

    return sendSuccess(res, 'All users fetched successfully', {
      total: rows.length,
      items: rows
    }, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getUserByAdmin = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendError(res, 'User id required', 400, 'BAD_REQUEST');
  }

  try {
    const hasBatproxUsername = await hasUsersColumn('batprox_username');
    const hasBatproxPassword = await hasUsersColumn('batprox_password');
    const hasIsPlayStore = await hasUsersColumn('isPlayStore');
    const hasBalance = await hasUsersColumn('balance');

    const batproxUsernameSelect = hasBatproxUsername ? 'batprox_username' : 'NULL AS batprox_username';
    const batproxPasswordSelect = hasBatproxPassword ? 'batprox_password' : 'NULL AS batprox_password';
    const isPlayStoreSelect = hasIsPlayStore ? 'isPlayStore' : 'NULL AS isPlayStore';
    const balanceSelect = hasBalance ? 'balance' : '0.00 AS balance';

    const [rows] = await db.query(
      `SELECT id, name, phone, status, created_at,
              ${batproxUsernameSelect}, ${batproxPasswordSelect}, ${isPlayStoreSelect}, ${balanceSelect}
       FROM users
       WHERE id = ? AND COALESCE(role, 'user') <> 'admin'
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'User fetched successfully', rows[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const updateUserByAdmin = async (req, res) => {
  const { id } = req.params;
  const { phone, password, batprox_username, batprox_password, status, isPlayStore, balance } = req.body || {};

  if (!id) {
    return sendError(res, 'User id required', 400, 'BAD_REQUEST');
  }

  const updates = [];
  const params = [];

  try {
    const [existingUser] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (existingUser.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    if (phone !== undefined) {
      if (!phone) return sendError(res, 'Phone cannot be empty', 400, 'BAD_REQUEST');

      const [phoneRows] = await db.query('SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1', [phone, id]);
      if (phoneRows.length > 0) {
        return sendError(res, 'Phone already used by another user', 400, 'BAD_REQUEST');
      }
      updates.push('phone = ?');
      params.push(phone);
    }

    if (password !== undefined) {
      if (!password) return sendError(res, 'Password cannot be empty', 400, 'BAD_REQUEST');
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (batprox_username !== undefined) {
      const hasColumn = await hasUsersColumn('batprox_username');
      if (!hasColumn) return sendError(res, 'batprox_username column missing. Run migration first.', 400, 'BAD_REQUEST');
      updates.push('batprox_username = ?');
      params.push(batprox_username);
    }

    if (batprox_password !== undefined) {
      const hasColumn = await hasUsersColumn('batprox_password');
      if (!hasColumn) return sendError(res, 'batprox_password column missing. Run migration first.', 400, 'BAD_REQUEST');
      updates.push('batprox_password = ?');
      params.push(batprox_password);
    }

    if (isPlayStore !== undefined) {
      const hasColumn = await hasUsersColumn('isPlayStore');
      if (!hasColumn) return sendError(res, 'isPlayStore column missing. Run migration first.', 400, 'BAD_REQUEST');

      const normalizedIsPlayStore =
        isPlayStore === true ||
        isPlayStore === 1 ||
        isPlayStore === '1' ||
        (typeof isPlayStore === 'string' && isPlayStore.toLowerCase() === 'true')
          ? 1
          : 0;

      updates.push('isPlayStore = ?');
      params.push(normalizedIsPlayStore);
    }

    if (balance !== undefined) {
      const hasColumn = await hasUsersColumn('balance');
      if (!hasColumn) return sendError(res, 'balance column missing. Run migration first.', 400, 'BAD_REQUEST');

      const parsedBalance = Number(balance);
      if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
        return sendError(res, 'Invalid balance value. Must be a non-negative number.', 400, 'BAD_REQUEST');
      }

      updates.push('balance = ?');
      params.push(parsedBalance);
    }

    if (updates.length === 0) {
      return sendError(
        res,
        'Nothing to update. Provide at least one of: phone, password, batprox_username, batprox_password, status, isPlayStore, balance',
        400,
        'BAD_REQUEST'
      );
    }

    params.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedRows] = await db.query(
      `SELECT id, name, phone, status,
              ${await hasUsersColumn('batprox_username') ? 'batprox_username' : 'NULL AS batprox_username'},
              ${await hasUsersColumn('batprox_password') ? 'batprox_password' : 'NULL AS batprox_password'},
              ${await hasUsersColumn('isPlayStore') ? 'isPlayStore' : 'NULL AS isPlayStore'},
              ${await hasUsersColumn('balance') ? 'balance' : '0.00 AS balance'}
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return sendSuccess(res, 'User updated successfully by admin', updatedRows[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getUserBalanceById = async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user && req.user.id;

  if (!id) {
    return sendError(res, 'User id required', 400, 'BAD_REQUEST');
  }

  if (!requesterId) {
    return sendError(res, 'Authentication problem — user not found in token.', 401, 'UNAUTHORIZED');
  }

  try {
    const hasBalance = await hasUsersColumn('balance');
    if (!hasBalance) {
      return sendError(res, 'balance column missing. Run migration first.', 400, 'BAD_REQUEST');
    }

    const targetUserId = Number(id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return sendError(res, 'Invalid user id', 400, 'BAD_REQUEST');
    }

    const [requesterRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [requesterId]);
    if (requesterRows.length === 0) {
      return sendError(res, 'Authentication problem — User not found.', 401, 'UNAUTHORIZED');
    }

    const requesterRole = (requesterRows[0].role || '').toLowerCase();
    if (Number(requesterId) !== targetUserId && requesterRole !== 'admin') {
      return sendError(res, 'You can only view your own balance.', 403, 'FORBIDDEN');
    }

    const [rows] = await db.query(
      `SELECT id, name, balance
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (rows.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'User balance fetched successfully', rows[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getUserProfile = async (req, res) => {
  const userId = req.user && req.user.id;

  if (!userId) {
    return sendError(res, 'Authentication problem — user not found in token.', 401, 'UNAUTHORIZED');
  }

  try {
    const hasBatproxUsername = await hasUsersColumn('batprox_username');
    const hasBatproxPassword = await hasUsersColumn('batprox_password');
    const hasIsPlayStore = await hasUsersColumn('isPlayStore');
    const hasBalance = await hasUsersColumn('balance');

    const batproxUsernameSelect = hasBatproxUsername ? 'batprox_username' : 'NULL AS batprox_username';
    const batproxPasswordSelect = hasBatproxPassword ? 'batprox_password' : 'NULL AS batprox_password';
    const isPlayStoreSelect = hasIsPlayStore ? 'isPlayStore' : '0 AS isPlayStore';
    const balanceSelect = hasBalance ? 'balance' : '0.00 AS balance';

    const [userRows] = await db.query(
      `SELECT id, name, phone, status, created_at,
              ${batproxUsernameSelect}, ${batproxPasswordSelect}, ${isPlayStoreSelect}, ${balanceSelect}
       FROM users
       WHERE id = ? AND COALESCE(role, 'user') <> 'admin'
       LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    const user = userRows[0];

    // Get total deposit amount (sum of all confirmed deposits)
    const [depositRows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_deposit
       FROM transactions
       WHERE user_id = ? AND type = 'deposit' AND status = 'confirmed'`,
      [userId]
    );

    const deposit = depositRows[0]?.total_deposit || 0;

    // Get pending withdrawal amount (sum of all pending withdrawals)
    const [pendingRows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_pending
       FROM transactions
       WHERE user_id = ? AND type = 'withdraw' AND status = 'pending'`,
      [userId]
    );

    const pending = pendingRows[0]?.total_pending || 0;

    const profileData = {
      ...user,
      deposit: deposit.toString(),
      pending: pending.toString()
    };

    return sendSuccess(res, 'User fetched successfully', profileData, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const loginUser = async (req, res) => {
  const { phone, password } = req.body || {};

  if (!phone || !password) {
    return sendError(res, 'Phone and password are required', 400, 'BAD_REQUEST');
  }

  if (!secretKey) {
    return sendError(res, 'Server configuration error: JWT secret not set', 500, 'INTERNAL_SERVER_ERROR');
  }

  try {
    const hasIsDeleted = await hasUsersColumn('is_deleted');
    const isDeletedSelect = hasIsDeleted ? 'is_deleted' : '0 AS is_deleted';

    const [rows] = await db.query(
      `SELECT id, name, phone, password, token_version, refresh_token, ${isDeletedSelect}
       FROM users
       WHERE phone = ?`,
      [phone]
    );

    if (rows.length === 0) {
      return sendError(res, 'Invalid credentials', 401, 'UNAUTHORIZED');
    }

    const user = rows[0];
    if (Number(user.is_deleted || 0) === 1) {
      return sendError(res, 'Your account has been deleted. Contact support.', 403, 'FORBIDDEN');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return sendError(res, 'Invalid credentials', 401, 'UNAUTHORIZED');
    }

    const currentVersion = user.token_version || 0;
    const newVersion = currentVersion + 1;

    const refreshTokenStr = signRefreshToken({ id: user.id, token_version: newVersion, type: 'refresh' });

    await db.query('UPDATE users SET token_version = ?, refresh_token = ? WHERE id = ?', [newVersion, refreshTokenStr, user.id]);

    const accessToken = signAccessToken({ id: user.id, phone: user.phone, token_version: newVersion, type: 'access' });

    return sendSuccess(
      res,
      'Login successful',
      {
        tokens: {
          accessToken,
          refreshToken: refreshTokenStr,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
          expiresAt: buildExpiryDate(ACCESS_TOKEN_EXPIRES_IN_SECONDS)
        },
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone
        }
      },
      200
    );
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const registerUser = async (req, res) => {
  const { name, phone, password, isPlayStore } = req.body || {};

  if (!name) {
    return sendError(res, 'Name required', 400, 'BAD_REQUEST');
  }
  if (!phone) {
    return sendError(res, 'Phone required', 400, 'BAD_REQUEST');
  }
  if (!password) {
    return sendError(res, 'Password required', 400, 'BAD_REQUEST');
  }
  if (isPlayStore === undefined) {
    return sendError(res, 'isPlayStore required (0 or 1)', 400, 'BAD_REQUEST');
  }

  try {
    const hasIsPlayStore = await hasUsersColumn('isPlayStore');
    if (!hasIsPlayStore) {
      return sendError(res, 'isPlayStore column missing. Run migration first.', 400, 'BAD_REQUEST');
    }

    const normalizedIsPlayStore =
      isPlayStore === 1 ||
      isPlayStore === '1' ||
      isPlayStore === true ||
      (typeof isPlayStore === 'string' && isPlayStore.toLowerCase() === 'true')
        ? 1
        : isPlayStore === 0 ||
            isPlayStore === '0' ||
            isPlayStore === false ||
            (typeof isPlayStore === 'string' && isPlayStore.toLowerCase() === 'false')
          ? 0
          : null;

    if (normalizedIsPlayStore === null) {
      return sendError(res, 'Invalid isPlayStore value. Use 0 or 1', 400, 'BAD_REQUEST');
    }

    const [existing] = await db.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    if (existing.length > 0) {
      return sendError(res, 'Phone already registered', 400, 'BAD_REQUEST');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, phone, password, token_version, isPlayStore, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, hashedPassword, 0, normalizedIsPlayStore, 'inactive']
    );

    const accessToken = signAccessToken({ id: result.insertId, phone, token_version: 0, type: 'access' });
    const refreshTokenStr = signRefreshToken({ id: result.insertId, token_version: 0, type: 'refresh' });

    await db.query('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshTokenStr, result.insertId]);

    return sendSuccess(
      res,
      'User registered',
      {
        tokens: {
          accessToken,
          refreshToken: refreshTokenStr,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
          expiresAt: buildExpiryDate(ACCESS_TOKEN_EXPIRES_IN_SECONDS)
        },
        user: {
          id: result.insertId,
          name,
          phone,
          isPlayStore: normalizedIsPlayStore
        }
      },
      201
    );
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body || {};
  const image = req.file ? req.file.filename : null;

  try {
    const [result] = await db.query('UPDATE users SET name = ?, image = ? WHERE id = ?', [name, image, id]);
    if (result.affectedRows === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'User updated successfully', {}, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return sendError(res, `User with id ${id} not found`, 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'User deleted successfully', {}, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const createUserWithImage = async (req, res) => {
  const { name } = req.body || {};
  const image = req.file ? req.file.filename : null;
  if (!name || !image) {
    return sendError(res, 'Name and image are required', 400, 'BAD_REQUEST');
  }

  try {
    const [result] = await db.query('INSERT INTO users (name, image) VALUE (?, ?)', [name, image]);
    return sendSuccess(res, 'User created successfully', { id: result.insertId, name, image }, 201);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const createUserWithMedia = async (req, res) => {
  const { name } = req.body || {};
  const image = req.files?.image?.[0]?.filename || null;
  const video = req.files?.video?.[0]?.filename || null;
  if (!name || !image || !video) {
    return sendError(res, 'Name,image, and video are required', 400, 'BAD_REQUEST');
  }

  try {
    const [result] = await db.query('INSERT INTO users (name, image, video) VALUES (?, ?, ?)', [name, image, video]);
    return sendSuccess(res, 'User media uploaded successfully', { id: result.insertId, name, image, video }, 201);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return sendError(res, 'Refresh token required', 401, 'UNAUTHORIZED');

  try {
    const hasIsDeleted = await hasUsersColumn('is_deleted');
    const payload = jwt.verify(refreshToken, refreshSecret);
    if (payload.type !== 'refresh') {
      return sendError(res, 'Refresh token must not be used to access resources', 401, 'UNAUTHORIZED');
    }
    const userId = payload.id;

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return sendError(res, 'User not found', 401, 'UNAUTHORIZED');

    const user = rows[0];
    if (hasIsDeleted && Number(user.is_deleted || 0) === 1) {
      return sendError(res, 'Your account has been deleted. Contact support.', 403, 'FORBIDDEN');
    }

    if (!user.refresh_token || user.refresh_token !== refreshToken) {
      return sendError(res, 'Invalid refresh token', 403, 'FORBIDDEN');
    }

    const dbVersion = user.token_version || 0;
    if ((payload.token_version || 0) !== dbVersion) {
      return sendError(res, 'Refresh token invalidated', 403, 'FORBIDDEN');
    }

    const newAccessToken = signAccessToken({ id: user.id, phone: user.phone, token_version: dbVersion, type: 'access' });
    const newRefreshToken = signRefreshToken({ id: user.id, token_version: dbVersion, type: 'refresh' });

    await db.query('UPDATE users SET refresh_token = ? WHERE id = ?', [newRefreshToken, user.id]);

    return sendSuccess(
      res,
      'Token refreshed',
      {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
          expiresAt: buildExpiryDate(ACCESS_TOKEN_EXPIRES_IN_SECONDS)
        },
        user: sanitizeUser(user)
      },
      200
    );
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return sendError(res, 'Refresh token expired.', 401, 'UNAUTHORIZED');
    }
    return sendError(res, 'Refresh token invalid or tampered.', 401, 'UNAUTHORIZED');
  }
};

const logoutUser = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return sendError(res, 'Authentication problem unauthenticate', 401, 'UNAUTHORIZED');

    await db.query('UPDATE users SET token_version = token_version + 1, refresh_token = NULL WHERE id = ?', [userId]);

    return sendSuccess(res, 'Logged out successfully', {}, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const deleteAccount = async (req, res) => {
  const userId = req.user && req.user.id;

  if (!userId) {
    return sendError(res, 'Authentication problem — user not found in token.', 401, 'UNAUTHORIZED');
  }

  try {
    const hasIsDeleted = await hasUsersColumn('is_deleted');
    const hasDeletedAt = await hasUsersColumn('deleted_at');

    if (!hasIsDeleted || !hasDeletedAt) {
      return sendError(res, 'Soft delete columns missing. Run migration first.', 400, 'BAD_REQUEST');
    }

    const [rows] = await db.query('SELECT id, is_deleted FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    if (Number(rows[0].is_deleted || 0) === 1) {
      return sendSuccess(res, 'Account deleted successfully', {}, 200);
    }

    const hasStatus = await hasUsersColumn('status');
    const setClauses = [
      'is_deleted = 1',
      'deleted_at = CURRENT_TIMESTAMP',
      'token_version = token_version + 1',
      'refresh_token = NULL'
    ];

    if (hasStatus) {
      setClauses.push("status = 'inactive'");
    }

    await db.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, [userId]);

    return sendSuccess(res, 'Account deleted successfully', {}, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const createForgotPasswordRequest = async (req, res) => {
  const { phone } = req.body || {};

  if (!phone) {
    return sendError(res, 'Phone required', 400, 'BAD_REQUEST');
  }

  try {
    const [users] = await db.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    if (users.length === 0) {
      return sendError(res, 'User not found with this phone number', 404, 'NOT_FOUND');
    }

    const userId = users[0].id;
    const [result] = await db.query('INSERT INTO forgot_password_requests (user_id, phone, status) VALUES (?, ?, ?)', [userId, phone, 'pending']);

    return sendSuccess(
      res,
      'Forgot password request submitted',
      {
        id: result.insertId,
        user_id: userId,
        phone,
        status: 'pending'
      },
      201
    );
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Forgot password requests table is missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }

    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getForgotPasswordRequests = async (req, res) => {
  const { phone } = req.query || {};

  try {
    let query = `
      SELECT fpr.id, fpr.user_id, u.name, fpr.phone, fpr.status, fpr.requested_at, fpr.processed_at
      FROM forgot_password_requests fpr
      LEFT JOIN users u ON u.id = fpr.user_id
    `;
    const params = [];

    if (phone) {
      query += ' WHERE fpr.phone = ?';
      params.push(phone);
    }

    query += ' ORDER BY fpr.requested_at DESC';

    const [rows] = await db.query(query, params);

    return sendSuccess(res, 'Forgot password requests fetched successfully', { total: rows.length, items: rows }, 200);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Forgot password requests table is missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }

    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = {
  getUser,
  getAllUsersByAdmin,
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  deleteAccount,
  updateUser,
  deleteUser,
  uploadMedia,
  createUserWithImage,
  createUserWithMedia,
  createForgotPasswordRequest,
  getForgotPasswordRequests,
  updateUserByAdmin,
  getUserByAdmin,
  getUserBalanceById,
  getUserProfile
};
