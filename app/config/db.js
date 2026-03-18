// config/db.js
const mysql = require('mysql2/promise'); // Using promise version for async/await
require('dotenv').config(); // Ensure environment variables are loaded

// Create a connection pool (better performance than single connection)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_DATABASE || 'test_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Adjust based on your needs
  queueLimit: 0,
  connectTimeout: 10000, // 10 seconds timeout
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : undefined // For secure connections
});

// Test the connection when the app starts
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to MySQL as ID', connection.threadId);
    await connection.ping();
    console.log('✔ Database ping successful');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    // More detailed error logging
    if (err.code) console.error('Error code:', err.code);
    if (err.errno) console.error('Error number:', err.errno);
    if (err.sqlState) console.error('SQL state:', err.sqlState);
    
    // Exit the process if DB connection is critical
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Fail fast in production
    }
  } finally {
    if (connection) connection.release();
  }
}

// Immediately test the connection
testConnection();

// Optional: Add periodic connection check
setInterval(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  } catch (err) {
    console.error('Periodic connection check failed:', err);
  }
}, 60000); // Check every minute

module.exports = pool;