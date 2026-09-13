import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

let pool;

if (connectionString) {
    pool = new Pool({
        connectionString,
        ssl: false
    });

    // Attempt to connect with retry
    connectWithRetry();
} else {
    console.error('DATABASE_URL not set.');
}

function connectWithRetry(retries = 10, delay = 5000) {
    console.log(`Attempting to connect to PostgreSQL (Retries left: ${retries})...`);
    pool.connect()
        .then(client => {
            console.log('Connected to PostgreSQL database successfully.');
            client.release();
            initDb();
        })
        .catch(err => {
            console.error('Database connection failed:', err.message);
            if (retries > 0) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                setTimeout(() => connectWithRetry(retries - 1, delay), delay);
            } else {
                console.error('Could not connect to database after multiple attempts. Exiting.');
                process.exit(1);
            }
        });
}

// Wrapper to mimic SQLite interface
const db = {
    query: (text, params) => pool.query(text, params),

    run: function (sql, params, callback) {
        if (!pool) return callback(new Error('Database not connected'));

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);

        pool.query(pgSql, params)
            .then(res => {
                const mockContext = { changes: res.rowCount };
                callback.call(mockContext, null);
            })
            .catch(err => {
                console.error("DB Run Error:", err.message);
                callback(err);
            });
    },

    all: function (sql, params, callback) {
        if (!pool) return callback(new Error('Database not connected'));

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);

        pool.query(pgSql, params)
            .then(res => callback(null, res.rows))
            .catch(err => callback(err));
    },

    get: function (sql, params, callback) {
        if (!pool) return callback(new Error('Database not connected'));

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);

        pool.query(pgSql, params)
            .then(res => callback(null, res.rows[0]))
            .catch(err => callback(err));
    }
};

function initDb() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS products (
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
            display_index INTEGER DEFAULT 999,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            zip TEXT,
            total REAL,
            status TEXT DEFAULT 'new',
            items TEXT,
            payment_status TEXT DEFAULT 'pending',
            transaction_id TEXT,
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            razorpay_signature TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS refunds (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            refund_id TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS admin_settings (
            id SERIAL PRIMARY KEY,
            passcode TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS billing_products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL,
            barcode TEXT,
            category TEXT NOT NULL,
            subcategory TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            description TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS billing_categories (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS billing_invoices (
            id TEXT PRIMARY KEY,
            customer_name TEXT,
            customer_phone TEXT,
            customer_address TEXT,
            subtotal REAL NOT NULL,
            discount REAL DEFAULT 0,
            gst_rate REAL DEFAULT 0,
            gst_amount REAL DEFAULT 0,
            total REAL NOT NULL,
            payment_method TEXT DEFAULT 'CASH',
            items TEXT NOT NULL,
            status TEXT DEFAULT 'PAID',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS billing_customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS billing_settings (
            id INTEGER PRIMARY KEY,
            store_name TEXT DEFAULT 'Indrita Fabrics',
            tagline TEXT DEFAULT 'Tradition in Every Drape',
            address TEXT DEFAULT 'Kolkata, West Bengal, India',
            phone TEXT DEFAULT '+91 9876543210',
            gst_number TEXT DEFAULT '19AAAAA0000A1Z5',
            printer_model TEXT DEFAULT 'DEV 2IN1 632-L58P',
            printer_paper_width INTEGER DEFAULT 58,
            printer_dpi INTEGER DEFAULT 203,
            default_gst_rate REAL DEFAULT 18,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT;`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS display_index INTEGER DEFAULT 999;`
    ];

    const runQueries = async () => {
        for (const q of queries) {
            try {
                await pool.query(q);
                console.log("Table verified/created");
            } catch (err) {
                console.error('Table creation error:', err);
            }
        }

        // Seed admin_settings table if empty
        try {
            const result = await pool.query('SELECT COUNT(*) FROM admin_settings');
            if (parseInt(result.rows[0].count) === 0) {
                const defaultPasscode = process.env.ADMIN_PASSCODE || 'admin123';
                await pool.query('INSERT INTO admin_settings (passcode) VALUES ($1)', [defaultPasscode]);
                console.log("Seeded admin_settings with environment passcode.");
            }
        } catch (err) {
            console.error('Error seeding admin_settings:', err);
        }

        console.log("Database schema initialization complete.");
    };

    runQueries();
}

export default db;
