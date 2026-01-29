import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Use DATABASE_URL from environment or default to local
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ecommerce';

console.log('[DB] Connecting to PostgreSQL...');
// console.log('[DB] Connection String:', connectionString); 

const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Initialize Tables
const initDb = async () => {
    try {
        const client = await pool.connect();
        try {
            console.log('[DB] Connected. Initializing tables...');

            // Products Table
            await client.query(`
                CREATE TABLE IF NOT EXISTS products (
                    id VARCHAR(255) PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    category VARCHAR(255),
                    qty INTEGER DEFAULT 0,
                    image TEXT,
                    images TEXT, -- Storing JSON string for simplicity
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Orders Table
            await client.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    id VARCHAR(255) PRIMARY KEY,
                    name TEXT,
                    phone VARCHAR(50),
                    address TEXT,
                    city VARCHAR(100),
                    zip VARCHAR(20),
                    total DECIMAL(10,2),
                    status VARCHAR(50) DEFAULT 'new',
                    items TEXT, -- JSON string
                    payment_status VARCHAR(50) DEFAULT 'pending',
                    transaction_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('[DB] Tables initialized successfully.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[DB] Initialization Error:', err.message);
        console.error('[DB] Ensure PostgreSQL is running and DATABASE_URL is correct.');
    }
};

initDb();

export default pool;
