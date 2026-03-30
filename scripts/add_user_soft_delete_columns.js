const db = require('../app/config/db');

async function ensureUserSoftDeleteColumns() {
  const dbName = process.env.DB_DATABASE || 'test_db';

  try {
    const [isDeletedRows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_deleted'`,
      [dbName]
    );

    if (isDeletedRows.length === 0) {
      console.log('Adding is_deleted column to users table...');
      await db.query('ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
      console.log('is_deleted column added successfully');
    } else {
      console.log('is_deleted column already exists');
    }

    const [deletedAtRows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at'`,
      [dbName]
    );

    if (deletedAtRows.length === 0) {
      console.log('Adding deleted_at column to users table...');
      await db.query('ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL');
      console.log('deleted_at column added successfully');
    } else {
      console.log('deleted_at column already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure soft delete columns:', err.message || err);
    process.exit(1);
  }
}

ensureUserSoftDeleteColumns();
