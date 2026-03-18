const db = require('../app/config/db');

async function ensureUniqueEmail() {
  try {
    const dbName = process.env.DB_DATABASE || 'test_db';
    const [rows] = await db.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email' AND NON_UNIQUE = 0`,
      [dbName]
    );

    if (rows.length > 0) {
      console.log('Unique index on email already exists');
      process.exit(0);
    }

    console.log('Creating unique index on users(email)...');
    await db.query('CREATE UNIQUE INDEX uq_users_email ON users(email)');
    console.log('Unique index created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create unique index on email:', err.message || err);
    process.exit(1);
  }
}

ensureUniqueEmail();
