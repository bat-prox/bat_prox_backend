const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const uploadReceipt = multer({
  storage: receiptStorage,
  fileFilter: function (req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image (jpg, png, gif, webp) or PDF files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const hasUsersColumn = async (columnName) => {
  const [rows] = await db.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
};

const hasTableColumn = async (tableName, columnName) => {
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
  return rows.length > 0;
};

// Admin adds a new payment method
const addPaymentMethod = async (req, res) => {
  const { title, account_no, bank_name, bank_icon } = req.body || {};

  if (!title || !account_no || !bank_name) {
    return sendError(res, 'title, account_no, and bank_name are required', 400, 'BAD_REQUEST');
  }

  try {
    const [result] = await db.query(
      'INSERT INTO payment_methods (title, account_no, bank_name, bank_icon, status) VALUES (?, ?, ?, ?, ?)',
      [title, account_no, bank_name, bank_icon || null, 'active']
    );

    return sendSuccess(
      res,
      'Payment method added successfully',
      {
        id: result.insertId,
        title,
        account_no,
        bank_name,
        bank_icon: bank_icon || null,
        status: 'active'
      },
      201
    );
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Payment methods table is missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// User gets all active payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, account_no, bank_name, bank_icon, status, created_at
       FROM payment_methods
       WHERE status = 'active'
       ORDER BY created_at DESC`
    );

    return sendSuccess(res, 'Payment methods fetched successfully', { total: rows.length, items: rows }, 200);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Payment methods table is missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// Admin gets all payment methods (including inactive)
const getAllPaymentMethodsAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, account_no, bank_name, bank_icon, status, created_at, updated_at
       FROM payment_methods
       ORDER BY created_at DESC`
    );

    return sendSuccess(res, 'Payment methods fetched successfully', { total: rows.length, items: rows }, 200);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Payment methods table is missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// Admin updates payment method status or details
const updatePaymentMethod = async (req, res) => {
  const { id } = req.params;
  const { title, account_no, bank_name, bank_icon, status } = req.body || {};

  if (!id) {
    return sendError(res, 'Payment method id required', 400, 'BAD_REQUEST');
  }

  const updates = [];
  const params = [];

  try {
    const [existing] = await db.query('SELECT id FROM payment_methods WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Payment method not found', 404, 'NOT_FOUND');
    }

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (account_no !== undefined) {
      updates.push('account_no = ?');
      params.push(account_no);
    }
    if (bank_name !== undefined) {
      updates.push('bank_name = ?');
      params.push(bank_name);
    }
    if (bank_icon !== undefined) {
      updates.push('bank_icon = ?');
      params.push(bank_icon);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return sendError(res, 'Nothing to update', 400, 'BAD_REQUEST');
    }

    params.push(id);
    await db.query(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await db.query('SELECT * FROM payment_methods WHERE id = ?', [id]);

    return sendSuccess(res, 'Payment method updated successfully', updated[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// Admin deletes a payment method
const deletePaymentMethod = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, 'Payment method id required', 400, 'BAD_REQUEST');
  }

  const paymentMethodId = Number(id);
  if (!Number.isInteger(paymentMethodId) || paymentMethodId <= 0) {
    return sendError(res, 'Invalid payment method id', 400, 'BAD_REQUEST');
  }

  try {
    const [result] = await db.query('DELETE FROM payment_methods WHERE id = ?', [paymentMethodId]);

    if (result.affectedRows === 0) {
      return sendError(res, 'Payment method not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Payment method deleted successfully', {}, 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// User creates deposit request
const depositAmount = async (req, res) => {
  const { toAccountNo, toBank, toAccountTitle, fromAccount, fromBank, fromAccountTitle, amount, transactionId } = req.body || {};
  const recipt = req.file ? req.file.filename : null;

  if (!toAccountNo || !toBank || !toAccountTitle || !fromAccount || !fromBank || !fromAccountTitle || !amount || !transactionId) {
    return sendError(
      res,
      'Missing required fields: toAccountNo, toBank, toAccountTitle, fromAccount, fromBank, fromAccountTitle, amount, transactionId',
      400,
      'BAD_REQUEST'
    );
  }

  const user_id = req.user && req.user.id;
  if (!user_id) {
    return sendError(res, 'User not authenticated', 401, 'UNAUTHORIZED');
  }

  const parsedAmount = parseFloat(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return sendError(res, 'Amount must be a positive number', 400, 'BAD_REQUEST');
  }

  try {
    const [userRows] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]);
    if (userRows.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND');
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          transaction_id VARCHAR(255) UNIQUE NOT NULL,
          from_account VARCHAR(255) NOT NULL,
          from_bank VARCHAR(255) NOT NULL,
          from_account_title VARCHAR(255) NOT NULL,
          to_account_no VARCHAR(255) NOT NULL,
          to_bank VARCHAR(255) NOT NULL,
          to_account_title VARCHAR(255) NOT NULL,
          recipt VARCHAR(255) NULL,
          status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
          type ENUM('deposit', 'withdraw') DEFAULT 'deposit',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_transaction_id (transaction_id),
          INDEX idx_status (status),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add recipt column to existing tables that don't have it yet
    await db.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recipt VARCHAR(255) NULL`);

    const [existingTx] = await db.query('SELECT id FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
    if (existingTx.length > 0) {
      return sendError(res, 'Transaction ID already exists', 400, 'BAD_REQUEST');
    }

    const [result] = await db.query(
      `INSERT INTO transactions (
          user_id, amount, transaction_id, from_account, from_bank, from_account_title,
          to_account_no, to_bank, to_account_title, recipt, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, parsedAmount, transactionId, fromAccount, fromBank, fromAccountTitle, toAccountNo, toBank, toAccountTitle, recipt]
    );

    return sendSuccess(
      res,
      'Deposit recorded successfully (pending confirmation)',
      {
        id: result.insertId,
        transaction_id: transactionId,
        amount: parsedAmount,
        status: 'pending',
        recipt: recipt || null,
        user_id
      },
      201
    );
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getDepositRequests = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const { status, name } = req.query;

  const conditions = ["t.type = 'deposit'"];
  const filterParams = [];

  if (status !== undefined && status !== '') {
    conditions.push('t.status = ?');
    filterParams.push(status);
  }

  if (name !== undefined && name.trim() !== '') {
    conditions.push('u.name LIKE ?');
    filterParams.push(`%${name.trim()}%`);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM transactions t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE ${whereClause}`,
      filterParams
    );
    const total = countResult[0].total;

    const [rows] = await db.query(
      `SELECT t.*, u.name AS user_name, u.phone AS user_phone
       FROM transactions t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadsPublicPath = process.env.UPLOADS_PUBLIC_PATH || '/api/uploads';
    const items = rows.map(row => ({
      ...row,
      recipt: row.recipt ? `${baseUrl}${uploadsPublicPath}/${row.recipt}` : null
    }));

    return sendSuccess(res, 'Deposit requests fetched successfully', { total, page, limit, items }, 200);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Transactions table missing. Create a deposit first or check DB.', 500, 'INTERNAL_SERVER_ERROR');
    }
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// User creates withdraw request
const withdrawAmount = async (req, res) => {
  const { amount, account_title, bank_name, account_number } = req.body || {};

  if (!amount || !account_title || !bank_name || !account_number) {
    return sendError(res, 'Missing fields: amount, account_title, bank_name, account_number', 400, 'BAD_REQUEST');
  }

  const user_id = req.user && req.user.id;
  if (!user_id) {
    return sendError(res, 'User not authenticated', 401, 'UNAUTHORIZED');
  }

  const parsedAmount = parseFloat(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return sendError(res, 'Amount must be positive number', 400, 'BAD_REQUEST');
  }

  const transactionId = `W${Date.now()}${Math.floor(Math.random() * 1000)}`;

  try {
    const hasBalance = await hasUsersColumn('balance');
    if (!hasBalance) {
      return sendError(res, 'balance column missing. Run migration first.', 400, 'BAD_REQUEST');
    }

    const [
      hasFromAccount,
      hasFromBank,
      hasFromAccountTitle,
      hasToAccountNo,
      hasToBank,
      hasToAccountTitle
    ] = await Promise.all([
      hasTableColumn('transactions', 'from_account'),
      hasTableColumn('transactions', 'from_bank'),
      hasTableColumn('transactions', 'from_account_title'),
      hasTableColumn('transactions', 'to_account_no'),
      hasTableColumn('transactions', 'to_bank'),
      hasTableColumn('transactions', 'to_account_title')
    ]);

    if (!hasToAccountNo || !hasToBank || !hasToAccountTitle) {
      return sendError(res, 'Transactions table columns missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [userRows] = await connection.query('SELECT id, balance FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [user_id]);
      if (userRows.length === 0) {
        await connection.rollback();
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      const currentBalance = Number(userRows[0].balance || 0);
      if (parsedAmount > currentBalance) {
        await connection.rollback();
        return sendError(res, 'Insufficient balance', 400, 'BAD_REQUEST');
      }

      const [existingTx] = await connection.query('SELECT id FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
      if (existingTx.length > 0) {
        await connection.rollback();
        return sendError(res, 'Transaction ID already exists', 400, 'BAD_REQUEST');
      }

      const insertColumns = ['user_id', 'amount', 'transaction_id'];
      const insertValues = [user_id, parsedAmount, transactionId];

      if (hasFromAccount) {
        insertColumns.push('from_account');
        insertValues.push('');
      }

      if (hasFromBank) {
        insertColumns.push('from_bank');
        insertValues.push('');
      }

      if (hasFromAccountTitle) {
        insertColumns.push('from_account_title');
        insertValues.push('');
      }

      insertColumns.push('to_account_no', 'to_bank', 'to_account_title', 'status', 'type');
      insertValues.push(account_number, bank_name, account_title, 'pending', 'withdraw');

      const placeholders = insertColumns.map(() => '?').join(', ');

      const [result] = await connection.query(
        `INSERT INTO transactions (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        insertValues
      );

      await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [parsedAmount, user_id]);

      const [balanceRows] = await connection.query('SELECT balance FROM users WHERE id = ? LIMIT 1', [user_id]);
      const updatedBalance = balanceRows.length > 0 ? Number(balanceRows[0].balance || 0) : currentBalance - parsedAmount;

      await connection.commit();

      return sendSuccess(
        res,
        'Withdraw request created (pending approval)',
        {
          id: result.insertId,
          transaction_id: transactionId,
          amount: parsedAmount,
          status: 'pending',
          balance: updatedBalance
        },
        201
      );
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Transactions table missing. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      return sendError(res, 'Transactions schema mismatch. Please run migration script first.', 500, 'INTERNAL_SERVER_ERROR');
    }

    console.error('withdrawAmount error:', err && err.code, err && err.sqlMessage ? err.sqlMessage : err);
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// Admin updates deposit status
const updateDepositStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!id) {
    return sendError(res, 'Deposit ID required', 400, 'BAD_REQUEST');
  }

  const allowedMapped = {
    pending: 'pending',
    approved: 'confirmed',
    cancelled: 'failed',
    rejected: 'failed'
  };

  if (!allowedMapped[status]) {
    return sendError(res, 'Invalid status. Use: pending, approved, cancelled, rejected', 400, 'BAD_REQUEST');
  }

  const dbStatus = allowedMapped[status];

  try {
    const [existing] = await db.query('SELECT id FROM transactions WHERE id = ? AND type = "deposit" LIMIT 1', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Deposit not found', 404, 'NOT_FOUND');
    }

    await db.query('UPDATE transactions SET status = ? WHERE id = ?', [dbStatus, id]);

    const [updated] = await db.query('SELECT status, created_at FROM transactions WHERE id = ?', [id]);

    return sendSuccess(res, `Deposit status updated to ${dbStatus}`, updated[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// Admin updates withdraw status
const updateWithdrawStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!id) {
    return sendError(res, 'Withdraw ID required', 400, 'BAD_REQUEST');
  }

  const allowedMapped = {
    pending: 'pending',
    approved: 'confirmed',
    cancelled: 'failed',
    rejected: 'failed'
  };

  if (!allowedMapped[status]) {
    return sendError(res, 'Invalid status. Use: pending, approved, cancelled, rejected', 400, 'BAD_REQUEST');
  }

  const dbStatus = allowedMapped[status];

  try {
    const hasBalance = await hasUsersColumn('balance');
    if (!hasBalance) {
      return sendError(res, 'balance column missing. Run migration first.', 400, 'BAD_REQUEST');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        'SELECT id, user_id, amount, status FROM transactions WHERE id = ? AND type = "withdraw" LIMIT 1 FOR UPDATE',
        [id]
      );
      if (existing.length === 0) {
        await connection.rollback();
        return sendError(res, 'Withdraw not found', 404, 'NOT_FOUND');
      }

      const withdraw = existing[0];
      const previousStatus = withdraw.status;

      if (previousStatus === dbStatus) {
        await connection.rollback();
        return sendSuccess(res, `Withdraw status already ${dbStatus}`, { status: dbStatus }, 200);
      }

      let refunded = false;
      if (previousStatus === 'pending' && dbStatus === 'failed') {
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [withdraw.amount, withdraw.user_id]);
        refunded = true;
      }

      await connection.query('UPDATE transactions SET status = ? WHERE id = ?', [dbStatus, id]);

      const [updated] = await connection.query('SELECT status, created_at FROM transactions WHERE id = ?', [id]);

      await connection.commit();

      return sendSuccess(res, `Withdraw status updated to ${dbStatus}`, { ...updated[0], refunded }, 200);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getWithdrawRequests = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const { status, name } = req.query;

  const conditions = ["t.type = 'withdraw'"];
  const filterParams = [];

  if (status !== undefined && status !== '') {
    conditions.push('t.status = ?');
    filterParams.push(status);
  }

  if (name !== undefined && name.trim() !== '') {
    conditions.push('u.name LIKE ?');
    filterParams.push(`%${name.trim()}%`);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const hasBatproxUsername = await hasUsersColumn('batprox_username');
    const hasBatproxPassword = await hasUsersColumn('batprox_password');
    const [
      hasFromAccount,
      hasFromBank,
      hasFromAccountTitle,
      hasToAccountNo,
      hasToBank,
      hasToAccountTitle,
      hasRecipt
    ] = await Promise.all([
      hasTableColumn('transactions', 'from_account'),
      hasTableColumn('transactions', 'from_bank'),
      hasTableColumn('transactions', 'from_account_title'),
      hasTableColumn('transactions', 'to_account_no'),
      hasTableColumn('transactions', 'to_bank'),
      hasTableColumn('transactions', 'to_account_title'),
      hasTableColumn('transactions', 'recipt')
    ]);

    const batproxUsernameSelect = hasBatproxUsername ? 'u.batprox_username AS batprox_username' : 'NULL AS batprox_username';
    const batproxPasswordSelect = hasBatproxPassword ? 'u.batprox_password AS batprox_password' : 'NULL AS batprox_password';
    const fromAccountSelect = hasFromAccount ? "COALESCE(t.from_account, '') AS from_account" : "'' AS from_account";
    const fromBankSelect = hasFromBank ? "COALESCE(t.from_bank, '') AS from_bank" : "'' AS from_bank";
    const fromAccountTitleSelect = hasFromAccountTitle ? "COALESCE(t.from_account_title, '') AS from_account_title" : "'' AS from_account_title";
    const toAccountNoSelect = hasToAccountNo ? "COALESCE(t.to_account_no, '') AS to_account_no" : "'' AS to_account_no";
    const toBankSelect = hasToBank ? "COALESCE(t.to_bank, '') AS to_bank" : "'' AS to_bank";
    const toAccountTitleSelect = hasToAccountTitle ? "COALESCE(t.to_account_title, '') AS to_account_title" : "'' AS to_account_title";
    const reciptSelect = hasRecipt ? "COALESCE(t.recipt, '') AS recipt" : "'' AS recipt";

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ${whereClause}`,
      filterParams
    );
    const total = countResult[0].total;

    const [rows] = await db.query(
      `SELECT t.id, t.user_id, t.amount, t.transaction_id,
              ${fromAccountSelect},
              ${fromBankSelect},
              ${fromAccountTitleSelect},
              ${toAccountNoSelect},
              ${toBankSelect},
              ${toAccountTitleSelect},
              ${reciptSelect},
              t.status, t.type, t.created_at,
              u.name AS user_name, u.name AS name, u.status AS user_status, u.phone AS phone,
              ${batproxUsernameSelect}, ${batproxPasswordSelect}
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    return sendSuccess(res, 'Withdraw requests fetched successfully', { total, page, limit, items: rows }, 200);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Transactions table missing. Create a withdraw first.', 500, 'INTERNAL_SERVER_ERROR');
    }
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

// User gets own deposit/withdraw requests with optional status/type filter
const getUserPaymentRequests = async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) {
    return sendError(res, 'User not authenticated', 401, 'UNAUTHORIZED');
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 100);
  const offset = (page - 1) * limit;

  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';
  const rawType = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';

  const statusMap = {
    pending: 'pending',
    approved: 'confirmed',
    confirmed: 'confirmed',
    cancelled: 'failed',
    rejected: 'failed',
    failed: 'failed'
  };

  if (rawStatus && !statusMap[rawStatus]) {
    return sendError(res, 'Invalid status. Use: pending, approved, confirmed, cancelled, rejected, failed', 400, 'BAD_REQUEST');
  }

  if (rawType && rawType !== 'deposit' && rawType !== 'withdraw') {
    return sendError(res, 'Invalid type. Use: deposit or withdraw', 400, 'BAD_REQUEST');
  }

  const dbStatus = rawStatus ? statusMap[rawStatus] : null;

  try {
    const whereParts = ['t.user_id = ?'];
    const whereParams = [userId];

    if (rawType) {
      whereParts.push('t.type = ?');
      whereParams.push(rawType);
    }

    if (dbStatus) {
      whereParts.push('t.status = ?');
      whereParams.push(dbStatus);
    }

    const whereClause = whereParts.join(' AND ');

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transactions t
       WHERE ${whereClause}`,
      whereParams
    );

    const total = Number(countRows[0].total || 0);

    const [rows] = await db.query(
      `SELECT
          t.id,
          t.user_id,
          t.type,
          t.amount,
          t.transaction_id,
          t.from_account,
          t.from_bank,
          t.from_account_title,
          t.to_account_no,
          t.to_bank,
          t.to_account_title,
          t.status,
          t.created_at
       FROM transactions t
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    return sendSuccess(
      res,
      'User payment requests fetched successfully',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        filters: {
          status: rawStatus || null,
          type: rawType || null
        },
        items: rows
      },
      200
    );
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendSuccess(res, 'User payment requests fetched successfully', {
        page,
        limit,
        total: 0,
        totalPages: 0,
        filters: {
          status: rawStatus || null,
          type: rawType || null
        },
        items: []
      }, 200);
    }
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = {
  addPaymentMethod,
  getPaymentMethods,
  getAllPaymentMethodsAdmin,
  updatePaymentMethod,
  deletePaymentMethod,
  depositAmount,
  uploadReceipt,
  withdrawAmount,
  getDepositRequests,
  updateDepositStatus,
  updateWithdrawStatus,
  getWithdrawRequests,
  getUserPaymentRequests
};
