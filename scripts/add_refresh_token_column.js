const db = require('../app/config/db');

async function ensureRefreshTokenColumn() {
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'refresh_token'`,
      [process.env.DB_DATABASE || 'test_db']
    );

    if (rows.length > 0) {
      console.log('refresh_token column already exists');
      process.exit(0);
    }

    console.log('Adding refresh_token column to users table...');
    await db.query("ALTER TABLE users ADD COLUMN refresh_token TEXT NULL");
    console.log('refresh_token column added successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add refresh_token column:', err.message || err);
    process.exit(1);
  }
}

ensureRefreshTokenColumn();
