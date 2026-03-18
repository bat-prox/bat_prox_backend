const db = require('../app/config/db');

async function createPaymentMethodsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL,
        account_no VARCHAR(100) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_icon VARCHAR(255) NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_payment_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await db.query(sql);
    console.log('payment_methods table created or already exists');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create payment_methods table:', err.message || err);
    process.exit(1);
  }
}

createPaymentMethodsTable();
