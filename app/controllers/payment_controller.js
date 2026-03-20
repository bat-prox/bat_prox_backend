const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

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

  try {
    const [result] = await db.query('DELETE FROM payment_methods WHERE id = ?', [id]);

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
          status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
          type ENUM('deposit', 'withdraw') DEFAULT 'deposit',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_transaction_id (transaction_id),
          INDEX idx_status (status),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const [existingTx] = await db.query('SELECT id FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
    if (existingTx.length > 0) {
      return sendError(res, 'Transaction ID already exists', 400, 'BAD_REQUEST');
    }

    const [result] = await db.query(
      `INSERT INTO transactions (
          user_id, amount, transaction_id, from_account, from_bank, from_account_title,
          to_account_no, to_bank, to_account_title, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, parsedAmount, transactionId, fromAccount, fromBank, fromAccountTitle, toAccountNo, toBank, toAccountTitle]
    );

    return sendSuccess(
      res,
      'Deposit recorded successfully (pending confirmation)',
      {
        id: result.insertId,
        transaction_id: transactionId,
        amount: parsedAmount,
        status: 'pending',
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

  try {
    const [countResult] = await db.query("SELECT COUNT(*) as total FROM transactions WHERE type = 'deposit'");
    const total = countResult[0].total;

    const [rows] = await db.query(
      `SELECT * FROM transactions
       WHERE type = 'deposit'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return sendSuccess(res, 'Deposit requests fetched successfully', { total, page, limit, items: rows }, 200);
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
    const [existingTx] = await db.query('SELECT id FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
    if (existingTx.length > 0) {
      return sendError(res, 'Transaction ID already exists', 400, 'BAD_REQUEST');
    }

    const [result] = await db.query(
      `INSERT INTO transactions (
          user_id, amount, transaction_id, to_account_no, to_bank, to_account_title, status, type
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'withdraw')`,
      [user_id, parsedAmount, transactionId, account_number, bank_name, account_title]
    );

    return sendSuccess(
      res,
      'Withdraw request created (pending approval)',
      {
        id: result.insertId,
        transaction_id: transactionId,
        amount: parsedAmount,
        status: 'pending'
      },
      201
    );
  } catch (err) {
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
    const [existing] = await db.query('SELECT id FROM transactions WHERE id = ? AND type = "withdraw" LIMIT 1', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Withdraw not found', 404, 'NOT_FOUND');
    }

    await db.query('UPDATE transactions SET status = ? WHERE id = ?', [dbStatus, id]);

    const [updated] = await db.query('SELECT status, created_at FROM transactions WHERE id = ?', [id]);

    return sendSuccess(res, `Withdraw status updated to ${dbStatus}`, updated[0], 200);
  } catch (err) {
    return sendError(res, 'Database error', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const getWithdrawRequests = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  try {
    const [countResult] = await db.query("SELECT COUNT(*) as total FROM transactions WHERE type = 'withdraw'");
    const total = countResult[0].total;

    const [rows] = await db.query(
      `SELECT t.*, u.name as user_name FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE t.type = 'withdraw'
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return sendSuccess(res, 'Withdraw requests fetched successfully', { total, page, limit, items: rows }, 200);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(res, 'Transactions table missing. Create a withdraw first.', 500, 'INTERNAL_SERVER_ERROR');
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
  withdrawAmount,
  getDepositRequests,
  updateDepositStatus,
  updateWithdrawStatus,
  getWithdrawRequests
};
