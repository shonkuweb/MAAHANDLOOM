import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, 'ecommerce.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            subcategory TEXT,
            colors TEXT, -- JSON string
            qty INTEGER DEFAULT 0,
            image TEXT,
            images TEXT, -- JSON string
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating products table:", err);
        });

        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            zip TEXT,
            total REAL,
            status TEXT DEFAULT 'new',
            items TEXT, -- JSON string
            payment_status TEXT DEFAULT 'pending',
            transaction_id TEXT,
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            razorpay_signature TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating orders table:", err);
        });

        db.run(`CREATE TABLE IF NOT EXISTS refunds (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            refund_id TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating refunds table:", err);
        });

        // Migrations
        db.run(`ALTER TABLE products ADD COLUMN subcategory TEXT`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE products ADD COLUMN colors TEXT`, (err) => {
            // Ignore error if column already exists
        });

        // Admin Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS admin_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            passcode TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating admin_settings table:", err);
            } else {
                // Seed with .env password if empty
                db.get("SELECT COUNT(*) as count FROM admin_settings", (err, row) => {
                    if (!err && row.count === 0) {
                        const defaultPasscode = process.env.ADMIN_PASSCODE || 'admin123';
                        db.run("INSERT INTO admin_settings (passcode) VALUES (?)", [defaultPasscode], (err) => {
                            if (!err) console.log("Seeded admin_settings with environment passcode.");
                        });
                    }
                });
            }
        });

        console.log('Database tables initialized.');
    });
}

export default db;
