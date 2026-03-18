const db = require('../app/config/db');

async function ensureEmailIndex() {
  try {
    const dbName = process.env.DB_DATABASE || 'test_db';
    const [rows] = await db.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'`,
      [dbName]
    );

    if (rows.length > 0) {
      console.log('Index on email already exists');
      process.exit(0);
    }

    console.log('Creating index on users(email)...');
    await db.query('CREATE INDEX idx_users_email ON users(email)');
    console.log('Index created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create index on email:', err.message || err);
    process.exit(1);
  }
}

ensureEmailIndex();
