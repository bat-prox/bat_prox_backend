const db = require('../app/config/db');

async function ensureTokenVersionIndex() {
  try {
    const dbName = process.env.DB_DATABASE || 'test_db';
    const [rows] = await db.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version'`,
      [dbName]
    );

    if (rows.length > 0) {
      console.log('Index on token_version already exists');
      process.exit(0);
    }

    console.log('Creating index on users(token_version)...');
    await db.query('CREATE INDEX idx_users_token_version ON users(token_version)');
    console.log('Index created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create index on token_version:', err.message || err);
    process.exit(1);
  }
}

ensureTokenVersionIndex();
