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

module.exports = {
    addPaymentMethod,
    getPaymentMethods,
    getAllPaymentMethodsAdmin,
    updatePaymentMethod,
    deletePaymentMethod
};
