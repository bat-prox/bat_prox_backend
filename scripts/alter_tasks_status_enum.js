const db = require('../app/config/db');

async function alterTasksStatusEnum() {
  try {
    await db.query(`ALTER TABLE tasks MODIFY status ENUM('pending','processing','completed','canceled') DEFAULT 'pending';`);
    console.log('tasks.status ENUM altered to only pending, processing, completed, canceled');
    process.exit(0);
  } catch (err) {
    if (err.message && err.message.includes('already')) {
      console.log('tasks.status ENUM already includes canceled');
      process.exit(0);
    }
    console.error('Failed to alter tasks.status ENUM:', err.message || err);
    process.exit(1);
  }
}

alterTasksStatusEnum();
