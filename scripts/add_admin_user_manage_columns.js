const db = require('../app/config/db');

async function addColumnIfMissing(columnName, sqlTypeAndDefault) {
  const [rows] = await db.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  if (rows.length > 0) {
    console.log(`Column already exists: ${columnName}`);
    return;
  }

  await db.query(`ALTER TABLE users ADD COLUMN ${columnName} ${sqlTypeAndDefault}`);
  console.log(`Added column: ${columnName}`);
}

async function run() {
  try {
    await addColumnIfMissing('batprox_username', 'VARCHAR(255) NULL');
    await addColumnIfMissing('batprox_password', 'VARCHAR(255) NULL');
    await addColumnIfMissing('isPlayStore', 'TINYINT(1) NOT NULL DEFAULT 0');

    console.log('Admin-managed user columns are ready');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add admin-managed columns:', err.message || err);
    process.exit(1);
  }
}

run();
