const mysql = require('mysql2');
require('dotenv').config();

// Konfigurasi koneksi database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promise wrapper
const promisePool = pool.promise();

// Test koneksi
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error koneksi database:', err.message);
  } else {
    console.log('Database terhubung!');
    connection.release();
  }
});

module.exports = promisePool;