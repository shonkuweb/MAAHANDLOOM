import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env content relative to this file
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const sampleProducts = [
    {
        id: 'P1',
        name: 'Surat Silk Saree',
        description: 'Premium Surat Silk Saree with elegant border.',
        price: 2500,
        category: 'Surat Silk Special',
        qty: 10,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d30de7?q=80&w=1974&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1610030469983-98e550d30de7?q=80&w=1974&auto=format&fit=crop'])
    },
    {
        id: 'P2',
        name: 'Handloom Cotton Kraft',
        description: 'Authentic handloom cotton saree for daily wear.',
        price: 1200,
        category: 'Handloom Special',
        qty: 15,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2048&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2048&auto=format&fit=crop'])
    },
    {
        id: 'P3',
        name: 'Shantipuri Saree',
        description: 'Traditional Shantipuri weave with intricate patterns.',
        price: 1800,
        category: 'Shantipuri Special',
        qty: 8,
        image: 'https://images.unsplash.com/photo-1590736962295-86641e410714?q=80&w=1964&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1590736962295-86641e410714?q=80&w=1964&auto=format&fit=crop'])
    },
    {
        id: 'P4',
        name: 'Organic Cotton Variety',
        description: 'Soft and breathable organic cotton saree.',
        price: 950,
        category: 'Cotton Varieties',
        qty: 20,
        image: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2070&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2070&auto=format&fit=crop'])
    }
];

async function seed() {
    let db;
    // Dynamic Import logic matching server.js
    if (process.env.DB_TYPE === 'postgres') {
        console.log("Seeding PostgreSQL Database...");
        const { default: pgDb } = await import('./database.pg.js');
        db = pgDb;
    } else {
        console.log("Seeding SQLite Database...");
        const { default: sqliteDb } = await import('./database.js');
        db = sqliteDb;
    }

    // Wait for DB connection if needed (pg wrapper connects immediately, sqlite connects immediately)
    // We use a simple Timeout to ensure connection is ready if async
    await new Promise(r => setTimeout(r, 1000));

    console.log("Starting Seed...");

    const insertQuery = "INSERT INTO products (id, name, description, price, category, qty, image, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    // We can't use db.prepare/db.serialize because database.pg.js doesn't support them.
    // We must use db.run sequentially or in parallel.

    let completed = 0;

    // Helper for async usage of db.run
    const runAsync = (sql, params) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    try {
        for (const p of sampleProducts) {
            // Check if exists first to avoid duplicate key errors
            // But for a fresh restore, we can probably just try insert.
            // Or use ON CONFLICT DO NOTHING (PG) / OR IGNORE (SQLite)
            // Let's just try insert and catch error if it exists.

            try {
                await runAsync(insertQuery, [p.id, p.name, p.description, p.price, p.category, p.qty, p.image, p.images]);
                console.log(`Inserted: ${p.name}`);
            } catch (e) {
                console.log(`Skipped (or error): ${p.name} - ${e.message}`);
            }
            completed++;
        }
    } catch (err) {
        console.error("Seeding Error:", err);
    }

    console.log(`Seeding process finished. Processed ${completed} items.`);

    // Determine if we need to close connection. 
    // database.pg.js uses a pool which keeps process open.
    // We should exit.
    process.exit(0);
}

seed();
