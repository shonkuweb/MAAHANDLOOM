import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for Base64 images
app.use(express.static(path.join(__dirname, 'dist')));

// Serve static assets from root for dev (vite proxy setup handles this usually, but for production)
// Also serve 'public' folder if exists
app.use(express.static(path.join(__dirname, 'public')));


// --- PAYMENT GATEWAYS ---

/**
 * MOCK PAYMENT (Active)
 * Simulates a successful transaction for development/demo.
 */
const mockPaymentMiddleware = (req, res, next) => {
    // Simulate delay
    setTimeout(() => {
        // Simple random success/fail for robustness, but for demo we want success usually.
        // Let's say 95% success rate
        // const isSuccess = Math.random() > 0.05;
        const isSuccess = true; // FORCE SUCCESS FOR DEBUGGING

        if (isSuccess) {
            req.paymentDetails = {
                status: 'paid',
                transaction_id: 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
            };
            next();
        } else {
            res.status(400).json({ error: 'Payment Failed', message: 'Bank rejected transaction' });
        }
    }, 1500);
};

/**
 * REAL PAYMENT PLACEHOLDER (Razorpay/Stripe)
 * Uncomment and configure this when ready for production.
 */
/*
import Razorpay from 'razorpay';
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const realPaymentMiddleware = async (req, res, next) => {
    try {
        // 1. Verify Signature (if coming from frontend callback)
        // OR
        // 2. Create Order (if creating order before payment)
        
        // Example: logic to verify payment_id and signature from req.body
        const { payment_id, order_id, signature } = req.body;
        // ... verification logic ...
        
        req.paymentDetails = {
             status: 'paid',
             transaction_id: payment_id
        };
        next();
    } catch (error) {
        res.status(400).json({ error: 'Payment Verification Failed' });
    }
};
*/

// SWITCH HERE: Use mockPaymentMiddleware or realPaymentMiddleware
const processPayment = mockPaymentMiddleware;


// --- API ENDPOINTS ---

// PRODUCTS
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Parse JSON fields
        const products = rows.map(p => ({
            ...p,
            images: p.images ? JSON.parse(p.images) : []
        }));
        res.json(products);
    });
});

app.post('/api/products', (req, res) => {
    const { id, name, description, price, category, qty, image, images } = req.body;
    const finalId = id || 'P' + Date.now();
    const imagesStr = JSON.stringify(images || []);

    // Check if exists
    db.get("SELECT id FROM products WHERE id = ?", [finalId], (err, row) => {
        if (row) {
            // Update
            const sql = `UPDATE products SET name = ?, description = ?, price = ?, category = ?, qty = ?, image = ?, images = ? WHERE id = ?`;
            db.run(sql, [name, description, price, category, qty, image, imagesStr, finalId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product updated', id: finalId });
            });
        } else {
            // Insert
            const sql = `INSERT INTO products (id, name, description, price, category, qty, image, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [finalId, name, description, price, category, qty, image, imagesStr], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product created', id: finalId });
            });
        }
    });
});

app.delete('/api/products/:id', (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product deleted' });
    });
});

// ORDERS
app.get('/api/orders', (req, res) => {
    // In a real app, verify admin token
    db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const orders = rows.map(o => ({
            ...o,
            items: o.items ? JSON.parse(o.items) : []
        }));
        res.json(orders);
    });
});

app.post('/api/orders', processPayment, (req, res) => {
    const { name, phone, address, city, zip, items, total } = req.body;
    const { status, transaction_id } = req.paymentDetails;
    const id = 'ORD-' + Date.now().toString().slice(-6);
    const itemsStr = JSON.stringify(items);

    const sql = `INSERT INTO orders (id, name, phone, address, city, zip, total, items, status, payment_status, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [id, name, phone, address, city, zip, total, itemsStr, 'new', status, transaction_id], function (err) {
        if (err) {
            console.error('DB INSERT ERROR:', err);
            return res.status(500).json({ error: err.message });
        }

        // Update Stock
        // Note: This should be a transaction but kept simple for sqlite example without async helpers
        items.forEach(item => {
            db.run("UPDATE products SET qty = qty - ? WHERE id = ?", [item.qty, item.id]);
        });

        res.json({ message: 'Order created successfully', id, transaction_id });
    });
});

app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order status updated' });
    });
});

app.delete('/api/orders/:id', (req, res) => {
    db.run("DELETE FROM orders WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order deleted' });
    });
});

// AUTH
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === '1234') {
        res.json({ success: true, token: 'mock-jwt-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Credentials' });
    }
});

// Fallback for SPA
app.get(/.*/, (req, res) => {
    // If request accepts html and is not an API call
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
            if (err) {
                // If dist doesn't exist yet (dev mode), try serving source files for some routes or 404
                // But typically in dev mode we use Vite. This is for PRODUCTION.
                res.status(404).send('Production build not found. Run "npm run build" first.');
            }
        });
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
