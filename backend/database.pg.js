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
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT;`
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
        console.log("Database schema initialization complete.");
    };

    runQueries();
}

export default db;
