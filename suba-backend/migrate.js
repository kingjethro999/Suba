// migrate.js - Run database migration
import fs from 'fs';
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME || 'suba_db';

// First connect without database to create it
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  console.log('Connected to MySQL server. Creating database...');

  // Create database if it doesn't exist
  connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (error) => {
    if (error) {
      console.error('Failed to create database:', error);
      connection.end();
      process.exit(1);
    }

    console.log(`✅ Database '${dbName}' created or already exists.`);

    // Now connect to the specific database
    const dbConnection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      multipleStatements: true
    });

    dbConnection.connect((err) => {
      if (err) {
        console.error('Database connection failed:', err);
        connection.end();
        process.exit(1);
      }

      console.log('Connected to database. Running migration...');

      // First, add the missing column
      const addColumnSQL = `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS default_monthly_budget decimal(10,2) DEFAULT 0.00 AFTER default_currency;
      `;

      dbConnection.query(addColumnSQL, (error) => {
        if (error) {
          console.error('Failed to add column:', error);
          dbConnection.end();
          connection.end();
          process.exit(1);
        }

        console.log('✅ Added missing default_monthly_budget column.');

        // Now run the full migration
        const sql = fs.readFileSync('./migration.sql', 'utf8');

        dbConnection.query(sql, (error, results) => {
          if (error) {
            console.error('Migration failed:', error);
            console.error('Error details:', error.message);
            dbConnection.end();
            connection.end();
            process.exit(1);
          }

          console.log('✅ Migration completed successfully!');
          dbConnection.end();
          connection.end();
          process.exit(0);
        });
      });
    });
  });
});