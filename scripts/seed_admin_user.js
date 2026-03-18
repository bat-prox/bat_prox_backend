const bcrypt = require('bcrypt');
const db = require('../app/config/db');

async function ensureRoleColumn() {
  const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'role'");
  if (columns.length === 0) {
    await db.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'");
    console.log("Added 'role' column to users table");
  }
}

async function seedAdminUser() {
  const phone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!phone || !password) {
    console.error('ADMIN_PHONE and ADMIN_PASSWORD are required');
    process.exit(1);
  }

  try {
    await ensureRoleColumn();

    const hashedPassword = await bcrypt.hash(password, 10);
    const [existing] = await db.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);

    if (existing.length > 0) {
      const userId = existing[0].id;
      await db.query(
        'UPDATE users SET name = ?, password = ?, role = ?, token_version = token_version + 1 WHERE id = ?',
        [name, hashedPassword, 'admin', userId]
      );
      console.log(`Admin user updated successfully. id=${userId}, phone=${phone}`);
    } else {
      const [result] = await db.query(
        'INSERT INTO users (name, phone, password, role, token_version) VALUES (?, ?, ?, ?, ?)',
        [name, phone, hashedPassword, 'admin', 0]
      );
      console.log(`Admin user created successfully. id=${result.insertId}, phone=${phone}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin user:', err.message || err);
    process.exit(1);
  }
}

seedAdminUser();
