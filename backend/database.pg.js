import pkg from 'pg';
const { Pool } = pkg;
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
    console.log('Connected to PostgreSQL database.');
    initDb();
} else {
    console.error('DATABASE_URL not set.');
}

// Wrapper to mimic SQLite interface
const db = {
    query: (text, params) => pool.query(text, params),

    // SQLite: db.run(sql, [params], callback)
    // callback(err) - distinct from result
    run: function (sql, params, callback) {
        if (!pool) return callback(new Error('Database not connected'));

        // Convert ? to $1, $2, etc.
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);

        pool.query(pgSql, params)
            .then(res => {
                // Mimic 'this' context of sqlite run (lastID, changes) if possible, 
                // but commonly we just check err. 
                // PG doesn't return lastID easily without RETURNING clause.
                // We might need to adjust queries in server.js to use RETURNING id.
                // For now, call callback with null.
                callback.call({ changes: res.rowCount }, null);
            })
            .catch(err => {
                console.error("DB Error:", err);
                callback(err);
            });
    },

    // SQLite: db.all(sql, [params], callback)
    all: function (sql, params, callback) {
        if (!pool) return callback(new Error('Database not connected'));

        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);

        pool.query(pgSql, params)
            .then(res => callback(null, res.rows))
            .catch(err => callback(err));
    },

    // SQLite: db.get(sql, [params], callback)
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
    // PG specific compatible schema
    // Note: TEXT PRIMARY KEY is fine.
    // JSON in sqlite is TEXT, in PG it can be JSONB, but TEXT works for compatibility.
    // DATETIME DEFAULT CURRENT_TIMESTAMP works in both usually, but PG prefers TIMESTAMP.

    const queries = [
        `CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            qty INTEGER DEFAULT 0,
            image TEXT,
            images TEXT, 
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
        )`
    ];

    queries.forEach(q => {
        pool.query(q).catch(err => console.error('Table creation error:', err));
    });
}

export default db;
