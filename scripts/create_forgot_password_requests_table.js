const db = require('../app/config/db');

async function createForgotPasswordRequestsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS forgot_password_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL,
        PRIMARY KEY (id),
        INDEX idx_forgot_password_phone (phone),
        INDEX idx_forgot_password_status (status),
        CONSTRAINT fk_forgot_password_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await db.query(sql);
    console.log('forgot_password_requests table created or already exists');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create forgot_password_requests table:', err.message || err);
    process.exit(1);
  }
}

createForgotPasswordRequestsTable();
