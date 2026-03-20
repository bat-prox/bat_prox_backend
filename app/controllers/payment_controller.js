const db = require('../config/db');

// Admin adds a new payment method
const addPaymentMethod = async (req, res) => {
    const { title, account_no, bank_name, bank_icon } = req.body || {};

    if (!title || !account_no || !bank_name) {
        return res.status(400).json({
            message: 'title, account_no, and bank_name are required'
        });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO payment_methods (title, account_no, bank_name, bank_icon, status) VALUES (?, ?, ?, ?, ?)',
            [title, account_no, bank_name, bank_icon || null, 'active']
        );

        return res.status(201).json({
            message: 'Payment method added successfully',
            data: {
                id: result.insertId,
                title,
                account_no,
                bank_name,
                bank_icon: bank_icon || null,
                status: 'active'
            }
        });
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Payment methods table is missing. Please run migration script first.',
                error: err.message
            });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
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

        return res.status(200).json({
            message: 'success',
            total: rows.length,
            data: rows
        });
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Payment methods table is missing. Please run migration script first.',
                error: err.message
            });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
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

        return res.status(200).json({
            message: 'success',
            total: rows.length,
            data: rows
        });
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Payment methods table is missing. Please run migration script first.',
                error: err.message
            });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin updates payment method status or details
const updatePaymentMethod = async (req, res) => {
    const { id } = req.params;
    const { title, account_no, bank_name, bank_icon, status } = req.body || {};

    if (!id) {
        return res.status(400).json({ message: 'Payment method id required' });
    }

    const updates = [];
    const params = [];

    try {
        const [existing] = await db.query('SELECT id FROM payment_methods WHERE id = ? LIMIT 1', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Payment method not found' });
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
            return res.status(400).json({
                message: 'Nothing to update'
            });
        }

        params.push(id);
        await db.query(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`, params);

        const [updated] = await db.query('SELECT * FROM payment_methods WHERE id = ?', [id]);

        return res.status(200).json({
            message: 'Payment method updated successfully',
            data: updated[0]
        });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin deletes a payment method
const deletePaymentMethod = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'Payment method id required' });
    }

    try {
        const [result] = await db.query('DELETE FROM payment_methods WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Payment method not found' });
        }

        return res.status(200).json({
            message: 'Payment method deleted successfully'
        });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin processes deposit
const depositAmount = async (req, res) => {
    const { toAccountNo, toBank, toAccountTitle, fromAccount, fromBank, fromAccountTitle, amount, transactionId } = req.body || {};

    // Validation
    if (!toAccountNo || !toBank || !toAccountTitle || !fromAccount || !fromBank || !fromAccountTitle || !amount || !transactionId) {
        return res.status(400).json({ message: 'Missing required fields: toAccountNo, toBank, toAccountTitle, fromAccount, fromBank, fromAccountTitle, amount, transactionId' });
    }

    // Use authenticated user as recipient
    const user_id = req.user.id;
    if (!user_id) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    try {
        // Check if user exists
        const [userRows] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Skip payment method validation for user deposit proof-of-payment
        // const [paymentRows] = await db.query('SELECT id FROM payment_methods WHERE account_no = ? AND bank_name = ? AND status = "active" LIMIT 1', [toAccountNo, toBank]);
        // if (paymentRows.length === 0) {
        //     return res.status(400).json({ message: 'Invalid destination account. Must match active payment method.' });
        // }

        // Create transactions table if not exists
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

        // Check if transactionId already exists
        const [existingTx] = await db.query('SELECT id FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
        if (existingTx.length > 0) {
            return res.status(409).json({ message: 'Transaction ID already exists' });
        }

        // Insert transaction
        const [result] = await db.query(`
            INSERT INTO transactions (
                user_id, amount, transaction_id, from_account, from_bank, from_account_title,
                to_account_no, to_bank, to_account_title, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [user_id, parsedAmount, transactionId, fromAccount, fromBank, fromAccountTitle, toAccountNo, toBank, toAccountTitle]);

        return res.status(201).json({
            message: 'Deposit recorded successfully (pending confirmation)',
            data: {
                id: result.insertId,
                transaction_id: transactionId,
                amount: parsedAmount,
                status: 'pending',
                user_id
            }
        });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};
const getDepositRequests = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Total count
        const [countResult] = await db.query("SELECT COUNT(*) as total FROM transactions WHERE type = 'deposit'");
        const total = countResult[0].total;

        // Paginated data
        const [rows] = await db.query(
            `SELECT * FROM transactions 
             WHERE type = 'deposit' 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`, 
            [limit, offset]
        );

        return res.status(200).json({
            message: 'success',
            total,
            page,
            limit,
            data: rows
        });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Transactions table missing. Create a deposit first or check DB.',
                error: err.message
            });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin processes withdraw request
const withdrawAmount = async (req, res) => {
    const { amount, account_title, bank_name, account_number } = req.body;

    if (!amount || !account_title || !bank_name || !account_number) {
        return res.status(400).json({ message: 'Missing fields: amount, account_title, bank_name, account_number' });
    }

    const user_id = req.user.id;
    if (!user_id) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be positive number' });
    }

    const transactionId = `W${Date.now()}${Math.floor(Math.random() * 1000)}`;

    try {
        const [existingTx] = await db.query('SELECT id FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
        if (existingTx.length > 0) {
            return res.status(409).json({ message: 'Transaction ID already exists' });
        }

        const [result] = await db.query(`
            INSERT INTO transactions (
                user_id, amount, transaction_id, to_account_no, to_bank, to_account_title, status, type
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'withdraw')
        `, [user_id, parsedAmount, transactionId, account_number, bank_name, account_title]);

        return res.status(201).json({
            message: 'Withdraw request created (pending approval)',
            data: {
                id: result.insertId,
                transaction_id: transactionId,
                amount: parsedAmount,
                status: 'pending'
            }
        });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin updates deposit status
const updateDepositStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Deposit ID required' });
    }

    const allowedMapped = {
        'pending': 'pending',
        'approved': 'confirmed',
        'cancelled': 'failed',
        'rejected': 'failed'
    };

    if (!allowedMapped[status]) {
        return res.status(400).json({ message: 'Invalid status. Use: pending, approved, cancelled, rejected' });
    }

    const dbStatus = allowedMapped[status];

    try {
        const [existing] = await db.query('SELECT id FROM transactions WHERE id = ? AND type = \"deposit\" LIMIT 1', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        await db.query('UPDATE transactions SET status = ? WHERE id = ?', [dbStatus, id]);

        const [updated] = await db.query('SELECT status, created_at FROM transactions WHERE id = ?', [id]);

        return res.status(200).json({
            message: `Deposit status updated to ${dbStatus}`,
            data: updated[0]
        });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin updates withdraw status
const updateWithdrawStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Withdraw ID required' });
    }

    const allowedMapped = {
        'pending': 'pending',
        'approved': 'confirmed',
        'cancelled': 'failed',
        'rejected': 'failed'
    };

    if (!allowedMapped[status]) {
        return res.status(400).json({ message: 'Invalid status. Use: pending, approved, cancelled, rejected' });
    }

    const dbStatus = allowedMapped[status];

    try {
        const [existing] = await db.query('SELECT id FROM transactions WHERE id = ? AND type = \"withdraw\" LIMIT 1', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Withdraw not found' });
        }

        await db.query('UPDATE transactions SET status = ? WHERE id = ?', [dbStatus, id]);

        const [updated] = await db.query('SELECT status, created_at FROM transactions WHERE id = ?', [id]);

        return res.status(200).json({
            message: `Withdraw status updated to ${dbStatus}`,
            data: updated[0]
        });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

const getWithdrawRequests = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Total count
        const [countResult] = await db.query("SELECT COUNT(*) as total FROM transactions WHERE type = 'withdraw'");
        const total = countResult[0].total;

        // Paginated data with user name
        const [rows] = await db.query(
            `SELECT t.*, u.name as user_name FROM transactions t 
             JOIN users u ON t.user_id = u.id
             WHERE t.type = 'withdraw' 
             ORDER BY t.created_at DESC 
             LIMIT ? OFFSET ?`, 
            [limit, offset]
        );

        return res.status(200).json({
            message: 'success',
            total,
            page,
            limit,
            data: rows
        });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Transactions table missing. Create a withdraw first.',
                error: err.message
            });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
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
