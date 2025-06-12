// src/database/db.ts
import { openDatabaseSync } from 'expo-sqlite';
import bcrypt from 'bcryptjs';

const db = openDatabaseSync('bizpro.db');

export const initDB = async () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (itemId) REFERENCES inventory(id)
      );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_id ON inventory(id);
      CREATE INDEX IF NOT EXISTS idx_sales_itemId ON sales(itemId);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Create default admin user if none exist
    const userCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if (userCount?.count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.runAsync(
        'INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin', new Date().toISOString()]
      );
      console.log('Created default admin user (username: admin, password: admin123)');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export default db;