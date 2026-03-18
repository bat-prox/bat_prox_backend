const db = require('../app/config/db');

async function checkUsersColumns() {
  try {
    const [rows] = await db.query('SHOW COLUMNS FROM users');
    for (const row of rows) {
      console.log(`${row.Field}:${row.Type}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to read users columns:', err.message || err);
    process.exit(1);
  }
}

checkUsersColumns();
