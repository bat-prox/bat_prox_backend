const path = require('path');
const { spawn } = require('child_process');

const STARTUP_MIGRATION_SCRIPTS = [
  'create_tasks_table.js',
  'create_payment_methods_table.js',
  'create_forgot_password_requests_table.js',
  'add_token_version.js',
  'add_refresh_token_column.js',
  'add_balance_column.js',
  'add_admin_user_manage_columns.js',
  'add_user_soft_delete_columns.js',
  'add_index_token_version.js',
  'add_index_email.js',
  'add_task_time_columns.js',
  'alter_tasks_status_enum.js'
];

const runScript = (scriptName) =>
  new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, scriptName);
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start migration ${scriptName}: ${err.message || err}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        return resolve();
      }
      return reject(new Error(`Migration failed: ${scriptName} (exit code ${code})`));
    });
  });

async function runStartupMigrations(options = {}) {
  const failFast = options.failFast !== undefined ? Boolean(options.failFast) : true;

  for (const scriptName of STARTUP_MIGRATION_SCRIPTS) {
    try {
      console.log(`[migrations] Running ${scriptName}`);
      await runScript(scriptName);
      console.log(`[migrations] Completed ${scriptName}`);
    } catch (err) {
      console.error(`[migrations] ${err.message || err}`);
      if (failFast) {
        throw err;
      }
    }
  }
}

if (require.main === module) {
  runStartupMigrations({ failFast: true })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  runStartupMigrations,
  STARTUP_MIGRATION_SCRIPTS
};
