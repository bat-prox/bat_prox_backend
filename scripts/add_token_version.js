const db = require('../app/config/db');

async function ensureTokenVersionColumn() {
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version'`,
      [process.env.DB_DATABASE || 'test_db']
    );

    if (rows.length > 0) {
      console.log('token_version column already exists');
      process.exit(0);
    }

    console.log('Adding token_version column to users table...');
    await db.query("ALTER TABLE users ADD COLUMN token_version INT DEFAULT 0");
    console.log('token_version column added successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add token_version column:', err.message || err);
    process.exit(1);
  }
}

ensureTokenVersionColumn();
