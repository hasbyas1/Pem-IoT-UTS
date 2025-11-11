const mysql = require('mysql2');
require('dotenv').config();

// Koneksi pertama tanpa database (untuk membuat database)
const connectionWithoutDB = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Jalankan query setup
connectionWithoutDB.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
  if (err) {
    console.error('Error membuat database:', err.message);
  } else {
    console.log('Database sudah tersedia');
  }
  
  connectionWithoutDB.query(`USE ${process.env.DB_NAME}`, (err) => {
    if (err) {
      console.error('Error menggunakan database:', err.message);
    }
    
    connectionWithoutDB.query(`
      CREATE TABLE IF NOT EXISTS data_sensor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        suhu FLOAT NOT NULL,
        humidity FLOAT NOT NULL,
        lux INT DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error membuat tabel:', err.message);
      } else {
        console.log('Tabel data_sensor sudah tersedia');
      }
      connectionWithoutDB.end();
    });
  });
});

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
    console.log('Database terhubung');
    connection.release();
  }
});

module.exports = promisePool;