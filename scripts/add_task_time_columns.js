const db = require('../app/config/db');

async function ensureTaskTimeColumns() {
  try {
    const dbName = process.env.DB_DATABASE || 'test_db';

    const [startCol] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'startTaskAt'`,
      [dbName]
    );

    const [endCol] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'endTaskAt'`,
      [dbName]
    );

    if (startCol.length === 0) {
      console.log('Adding startTaskAt column...');
      await db.query("ALTER TABLE tasks ADD COLUMN startTaskAt DATETIME NULL");
      console.log('startTaskAt added');
    } else {
      console.log('startTaskAt already exists');
    }

    if (endCol.length === 0) {
      console.log('Adding endTaskAt column...');
      await db.query("ALTER TABLE tasks ADD COLUMN endTaskAt DATETIME NULL");
      console.log('endTaskAt added');
    } else {
      console.log('endTaskAt already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed to add task time columns:', err.message || err);
    process.exit(1);
  }
}

ensureTaskTimeColumns();
