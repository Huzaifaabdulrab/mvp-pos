import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// @ts-ignore
const Database = require('better-sqlite3');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'mvpos.db');

if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ===== TABLES =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    barcode TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    discount REAL DEFAULT 0,
    paid REAL DEFAULT 0,
    items TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ===== MIGRATIONS (purane DB ko fix karta hai) =====
function columnExists(table: string, column: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return cols.some((c) => c.name === column);
}

if (!columnExists('users', 'role')) {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'`);
  console.log('Migration: added role column to users');
}
if (!columnExists('users', 'created_at')) {
  db.exec(`ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
}
if (!columnExists('products', 'barcode')) {
  db.exec(`ALTER TABLE products ADD COLUMN barcode TEXT`);
}
if (!columnExists('sales', 'synced')) {
  db.exec(`ALTER TABLE sales ADD COLUMN synced INTEGER DEFAULT 0`);
}
if (!columnExists('sales', 'paid')) {
  db.exec(`ALTER TABLE sales ADD COLUMN paid REAL DEFAULT 0`);
}

// ===== DEFAULT ADMIN =====
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
    .run('admin', '123456', 'admin');
}

// ===== DEFAULT PRODUCTS =====
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
if (productCount.c === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, category, price, stock, barcode) VALUES (?, ?, ?, ?, ?)'
  );
  const dummy = [
    ['Coca Cola 500ml', 'Drinks', 100, 50, '1001'],
    ['Pepsi 500ml', 'Drinks', 100, 40, '1002'],
    ['Lays Chips', 'Snacks', 50, 30, '1003'],
    ['Dairy Milk', 'Chocolate', 150, 20, '1004'],
    ['Biscuit Pack', 'Snacks', 60, 80, '1005'],
    ['Mineral Water', 'Drinks', 40, 100, '1006'],
    ['Red Bull', 'Drinks', 350, 15, '1007'],
    ['KitKat', 'Chocolate', 120, 25, '1008'],
  ];
  dummy.forEach((d) => insert.run(...d));
}

console.log('DB ready:', dbPath);