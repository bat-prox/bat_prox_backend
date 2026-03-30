const db = require('../app/config/db');

const DEFAULT_CONFIGS = [
  { key: 'contact_number', value: '+0000000000', type: 'string' },
  { key: 'privacy_policy', value: 'https://batprox.com/privacy-policy', type: 'string' },
  { key: 'maintenance_mode', value: 'false', type: 'boolean' },
  { key: 'min_version', value: '1.0.0', type: 'string' },
  { key: 'force_update', value: 'false', type: 'boolean' },
  { key: 'enable_chat', value: 'true', type: 'boolean' },
  { key: 'enable_payment', value: 'true', type: 'boolean' }
];

async function createAppConfigTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`key\` VARCHAR(100) NOT NULL,
        value TEXT NULL,
        type ENUM('string', 'boolean', 'number', 'json') NOT NULL DEFAULT 'string',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_app_config_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    for (const item of DEFAULT_CONFIGS) {
      await db.query(
        `INSERT INTO app_config (\`key\`, value, type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           value = VALUES(value),
           type = VALUES(type),
           updated_at = CURRENT_TIMESTAMP`,
        [item.key, item.value, item.type]
      );
    }

    console.log('app_config table is ready with default values');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create app_config table:', err.message || err);
    process.exit(1);
  }
}

createAppConfigTable();
