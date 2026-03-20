const db = require('../app/config/db');

async function ensureBalanceColumn() {
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'balance'`,
      [process.env.DB_DATABASE || 'test_db']
    );

    if (rows.length > 0) {
      console.log('balance column already exists');
      process.exit(0);
    }

    console.log('Adding balance column to users table...');
    await db.query('ALTER TABLE users ADD COLUMN balance DECIMAL(15,2) NOT NULL DEFAULT 0.00');
    console.log('balance column added successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add balance column:', err.message || err);
    process.exit(1);
  }
}

ensureBalanceColumn();
