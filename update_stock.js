import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env if present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function updateStock() {
    try {
        console.log('Connecting to the database...');
        if (!process.env.DATABASE_URL) {
            console.error('ERROR: DATABASE_URL is not set in the environment variables.');
            console.error('Make sure you are running this in the production environment with the correct .env file.');
            process.exit(1);
        }

        const res = await pool.query('SELECT id, qty, colors FROM products');
        const products = res.rows;
        console.log(`Found ${products.length} products. Updating stock...`);

        let updatedCount = 0;
        for (const p of products) {
            let colorsStr = p.colors;
            if (colorsStr && colorsStr !== 'null') {
                try {
                    const colors = JSON.parse(colorsStr);
                    if (Array.isArray(colors)) {
                        colors.forEach(c => {
                            c.qty = 20;
                        });
                        colorsStr = JSON.stringify(colors);
                    }
                } catch (e) {
                    console.error(`Error parsing colors for product ${p.id}:`, e);
                }
            }

            await pool.query('UPDATE products SET qty = 20, colors = $1 WHERE id = $2', [colorsStr, p.id]);
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} products to have a stock quantity of 20.`);
    } catch (error) {
        console.error('Error updating stock:', error);
    } finally {
        await pool.end();
    }
}

updateStock();
