// suba-backend/models/db.js
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// Use connection pooling instead of a single connection
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000, // 60 seconds
  timeout: 60000, // 60 seconds
});

// Create promise-based version
export const dbPromise = db.promise();

// Test the connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection failed:', err.message);
  } else {
    console.log('✅ Connected to MySQL database');
    connection.release(); // Release the connection back to the pool
  }
});

// Add error handling for the pool
db.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed.');
  } else if (err.code === 'ER_CON_COUNT_ERROR') {
    console.log('Database has too many connections.');
  } else if (err.code === 'ECONNREFUSED') {
    console.log('Database connection was refused.');
  }
});