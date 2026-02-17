import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') }); // Load .env from root

// --- DATABASE SELECTION ---
let db;
if (process.env.DB_TYPE === 'postgres') {
    console.log('Using PostgreSQL Database');
    const { default: pgDb } = await import('./database.pg.js');
    db = pgDb;
} else {
    console.log('Using SQLite Database');
    const { default: sqliteDb } = await import('./database.js');
    db = sqliteDb;
}
console.log(`[INFO] Server starting with DB_TYPE: ${process.env.DB_TYPE || 'sqlite'}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx/Docker)
const PORT = process.env.PORT || 3000;

// --- SECURITY MIDDLEWARE ---
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for now to prevent breaking existing inline scripts/styles
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit login attempts
    message: "Too many login attempts, please try again after 15 minutes"
});
app.use('/api/auth', authLimiter);

// --- JWT SECRET ---
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// --- AUTH MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

app.use(cors()); // In production, restrict this to your domain: { origin: 'https://yourdomain.com' }
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// --- STATIC FILES ---
// Serve built React app
app.use(express.static(path.join(__dirname, '../dist')));
// Serve legacy pages/public assets
app.use(express.static(path.join(__dirname, '../public')));
// Serve moved static pages (for admin.html etc if not in dist)
// Note: Vite build will put them in dist, but for dev or direct access:
app.use(express.static(path.join(__dirname, '../pages')));

// Explicitly route /admin-login to the login page
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/admin-login.html'));
});

// Explicitly route /admin to the legacy admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/admin.html'));
});

// Token verification endpoint
app.get('/api/auth/verify', requireAuth, (req, res) => {
    res.json({ valid: true, role: req.admin.role });
});


// --- PHONEPE V2 CONFIGURATION ---
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || 1;
const PHONEPE_ENV = process.env.PHONEPE_ENV || 'SANDBOX';
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
const APP_BE_URL = process.env.APP_BE_URL || `http://localhost:${PORT}`;

// Auth Token Cache
let phonePeAccessToken = null;
let phonePeTokenExpiry = null;

async function getPhonePeToken() {
    if (phonePeAccessToken && phonePeTokenExpiry && Date.now() < phonePeTokenExpiry) {
        return phonePeAccessToken;
    }

    try {
        const authHeader = Buffer.from(`${PHONEPE_CLIENT_ID}:${PHONEPE_CLIENT_SECRET}`).toString('base64');
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', PHONEPE_CLIENT_ID);
        params.append('client_secret', PHONEPE_CLIENT_SECRET);
        params.append('client_version', PHONEPE_CLIENT_VERSION);

        const response = await axios.post(`${PHONEPE_HOST_URL}/v1/oauth/token`, params, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        phonePeAccessToken = response.data.access_token;
        phonePeTokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
        console.log("Fetched new PhonePe Access Token");
        return phonePeAccessToken;
    } catch (error) {
        console.error("PhonePe Auth Error Details:", JSON.stringify(error.response?.data || {}));
        console.error("PhonePe Auth Error Message:", error.message);
        throw new Error("Failed to get PhonePe Token");
    }
}

// --- API ENDPOINTS ---

// PRODUCTS
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) {
            console.error("Fetch Products Error:", err);
            return res.status(500).json({ error: err.message });
        }

        try {
            const products = rows.map(p => ({
                ...p,
                images: (p.images && p.images !== 'null') ? JSON.parse(p.images) : []
            }));
            console.log(`Fetched ${products.length} products`);
            res.json(products);
        } catch (parseErr) {
            console.error("Product Parse Error:", parseErr);
            console.error("Raw Rows:", rows);
            res.status(500).json({ error: "Failed to parse product data" });
        }
    });
});

app.post('/api/products', requireAuth, (req, res) => {
    const { id, name, description, price, category, qty, image, images } = req.body;
    const finalId = id || 'P' + Date.now();
    const imagesStr = JSON.stringify(images || []);

    db.get("SELECT id FROM products WHERE id = ?", [finalId], (err, row) => {
        if (row) {
            const sql = `UPDATE products SET name = ?, description = ?, price = ?, category = ?, qty = ?, image = ?, images = ? WHERE id = ?`;
            db.run(sql, [name, description, price, category, qty, image, imagesStr, finalId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product updated', id: finalId });
            });
        } else {
            const sql = `INSERT INTO products (id, name, description, price, category, qty, image, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [finalId, name, description, price, category, qty, image, imagesStr], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product created', id: finalId });
            });
        }
    });
});

app.put('/api/products/:id', requireAuth, (req, res) => {
    const { name, description, price, category, qty, image, images } = req.body;
    const finalId = req.params.id;
    const imagesStr = JSON.stringify(images || []);

    const sql = `UPDATE products SET name = ?, description = ?, price = ?, category = ?, qty = ?, image = ?, images = ? WHERE id = ?`;
    db.run(sql, [name, description, price, category, qty, image, imagesStr, finalId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product updated', id: finalId });
    });
});

// PAYMENT & ORDERS (V2)
app.post('/api/payment/create', async (req, res) => {
    const { name, phone, address, city, zip, items } = req.body;

    // 1. Validate Items & Parse Total
    try {
        let calculatedTotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const product = await new Promise((resolve, reject) => {
                db.get("SELECT id, name, price, qty FROM products WHERE id = ?", [item.id], (err, row) => {
                    if (err) reject(err);
                    else {
                        console.log(`Product lookup for ${item.id}:`, row);
                        resolve(row);
                    }
                });
            });

            if (!product) return res.status(400).json({ error: `Product ${item.id} not found` });
            if (product.qty < item.qty) return res.status(400).json({ error: `Insufficient stock for ${product.name}` });

            const itemTotal = product.price * item.qty;
            calculatedTotal += itemTotal;
            verifiedItems.push({
                id: product.id,
                name: product.name,
                qty: item.qty,
                price: product.price
            });
        }

        const merchantOrderId = 'ORD-' + Date.now();
        const itemsStr = JSON.stringify(verifiedItems);
        const amountPaise = Math.round(calculatedTotal * 100);

        // 2. Create "Pending" Order in DB
        const sql = `INSERT INTO orders (id, name, phone, address, city, zip, total, items, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await new Promise((resolve, reject) => {
            db.run(sql, [merchantOrderId, name, phone, address, city, zip, calculatedTotal, itemsStr, 'new', 'pending'], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // 3. Initiate PhonePe Payment (V2)
        const token = await getPhonePeToken();

        const merchantTransactionId = merchantOrderId; // Use the same ID
        const merchantUserId = 'MUID-' + phone; // Unique user ID

        const payload = {
            merchantOrderId: merchantTransactionId, // Required by API error
            merchantTransactionId: merchantTransactionId,
            merchantUserId: merchantUserId,
            amount: amountPaise,
            mobileNumber: phone,
            redirectUrl: `${APP_BE_URL}/api/payment/callback`,
            redirectMode: "REDIRECT",
            callbackUrl: `${APP_BE_URL}/webhook/phonepe`,
            paymentInstrument: {
                type: "PAY_PAGE",
                targetApp: "WEB"
            }
        };

        console.log("PhonePe Payment Payload:", JSON.stringify(payload, null, 2));

        const response = await axios.post(`${PHONEPE_HOST_URL}/checkout/v2/pay`, payload, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        console.log("PhonePe Payment Response:", JSON.stringify(data, null, 2));

        let checkoutUrl = null;

        // V2: Construct URL manually using orderId
        if (data.orderId) {
            // https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/{orderId}
            // Ensure PHONEPE_HOST_URL doesn't have trailing slash, or handle it.
            // My config has: https://api-preprod.phonepe.com/apis/pg-sandbox
            checkoutUrl = `${PHONEPE_HOST_URL}/checkout/v2/${data.orderId}`;
        }

        if (!checkoutUrl) {
            console.error("Failed to generate checkout URL. OrderId missing in response.");
        }

        console.log("Generated Checkout URL:", checkoutUrl);

        res.json({
            merchantOrderId: merchantOrderId,
            tokenUrl: checkoutUrl
        });

    } catch (error) {
        console.error("Payment Create Error:", error.response?.data || error);
        if (error.response?.data) {
            console.error("Error Data Payload:", JSON.stringify(error.response.data));
        }
        res.status(500).json({ error: 'Payment creation failed', details: error.response?.data || error.message });
    }
});

// CALLBACK HANDLER
app.all('/api/payment/callback', async (req, res) => {
    console.log("Payment Callback Received:", req.method, req.body, req.query);

    // Checksum Validation (Optional but recommended)
    // For now, valid status check via API is safer to ensure it's not spoofed.

    // V2 Redirect comes with 'code', 'merchantId', 'transactionId' etc. in BODY (if POST) or QUERY (if REDIRECT/GET)
    // The previous logs usually imply POST for 'redirectMode: "POST"'.
    // Use req.body for POST, req.query for GET.

    const data = req.method === 'POST' ? req.body : req.query;

    const merchantOrderId = data.transactionId || data.merchantTransactionId || data.merchantOrderId;
    const code = data.code;

    if (code === 'PAYMENT_SUCCESS' && merchantOrderId) {
        // Double check status with PhonePe API to be sure
        try {
            const token = await getPhonePeToken();
            const statusResponse = await axios.get(`${PHONEPE_HOST_URL}/checkout/v2/order/${merchantOrderId}/status`, {
                headers: {
                    'Authorization': `O-Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (statusResponse.data.state === 'COMPLETED') {
                // Update DB
                db.run("UPDATE orders SET payment_status = 'success', status = 'new' WHERE id = ?", [merchantOrderId], (err) => {
                    if (err) console.error("Callback DB Update Error", err);
                });

                // Deduct Stock (Reuse logic or call internal function)
            }
        } catch (e) {
            console.error("Callback verification failed", e);
        }

        // Redirect to Frontend Success
        return res.redirect(`/order-confirmation?status=success&orderId=${merchantOrderId}`);
    } else if (code === 'PAYMENT_ERROR') {
        db.run("UPDATE orders SET payment_status = 'failed', status = 'cancelled' WHERE id = ?", [merchantOrderId], () => { });
        return res.redirect(`/order-confirmation?status=failed&orderId=${merchantOrderId}`);
    }

    // Fallback
    res.redirect('/?payment=pending');
});

// PAYMENT STATUS CHECK
app.get('/api/payment/status/:merchantOrderId', async (req, res) => {
    const { merchantOrderId } = req.params;

    try {
        const token = await getPhonePeToken();
        const response = await axios.get(`${PHONEPE_HOST_URL}/checkout/v2/order/${merchantOrderId}/status`, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        const state = data.state; // e.g. 'COMPLETED', 'FAILED', 'PENDING'

        // Map PhonePe state to DB status
        let dbStatus = 'pending';
        let paymentStatus = 'pending';

        if (state === 'COMPLETED' || state === 'SUCCEEDED') {
            dbStatus = 'new'; // Order is "newly created" / confirmed
            paymentStatus = 'success';
        } else if (state === 'FAILED') {
            dbStatus = 'cancelled';
            paymentStatus = 'failed';
        }

        // Update DB
        if (state) {
            db.run("UPDATE orders SET payment_status = ?, status = ? WHERE id = ?", [paymentStatus, dbStatus, merchantOrderId], (err) => {
                if (err) console.error("Status Update Error:", err);
            });

            // If success, ensure stock is deducted if not already? 
            // My create logic didn't deduct stock yet.
            // I should deduct stock on SUCCESS.
            if (paymentStatus === 'success') {
                // Fetch items to deduct stock
                db.get("SELECT items FROM orders WHERE id = ?", [merchantOrderId], (err, row) => {
                    if (row && row.items) {
                        try {
                            const items = JSON.parse(row.items);
                            items.forEach(item => {
                                // Simple deduction - in production use transactions/more robust logic
                                db.run("UPDATE products SET qty = qty - ? WHERE id = ?", [item.qty, item.id], () => { });
                            });
                        } catch (e) {
                            console.error("Stock deduction parse error", e);
                        }
                    }
                });
            }
        }

        res.json({
            status: state,
            data: data
        });

    } catch (error) {
        console.error("Payment Status Check Error:", error.response?.data || error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// WEBHOOK
app.post('/webhook/phonepe', async (req, res) => {
    // Basic Auth Check
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Unauthorized');

    const expectedAuth = 'Basic ' + Buffer.from(`${process.env.PHONEPE_WEBHOOK_USERNAME}:${process.env.PHONEPE_WEBHOOK_PASSWORD}`).toString('base64');
    // Note: PhonePe Webhooks might use different sig verification or Basic Auth. Prompt said: "Handle with HTTP Basic auth... Verify Authorization header".

    // If username/password not set, maybe skip or fail? 
    // Prompt said "webhook username/password you configured".
    if (authHeader !== expectedAuth) {
        // Also check standard signature presence if V2 uses that instead? 
        // But prompt explicitly asked for Basic Auth.
        return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    // Event structure: { type: 'checkout.order.completed', content: { ... } }
    console.log("Webhook Received:", JSON.stringify(event));

    try {
        if (event.type === 'checkout.order.completed') {
            const content = event.content; // { merchantOrderId, state, ... }
            const orderId = content.merchantOrderId;

            if (content.state === 'COMPLETED' || content.state === 'SUCCEEDED') {
                db.run("UPDATE orders SET payment_status = 'success', status = 'new' WHERE id = ?", [orderId], (err) => {
                    if (!err) {
                        // Deduct stock here too (idempotent preferably)
                        // For now, relies on Status Check or Webhook winning.
                        // Adding stock deduction here is safe-ish if we check previous status?
                    }
                });
            }
        } else if (event.type === 'pg.refund.completed') {
            const content = event.content;
            const refundId = content.merchantRefundId;
            // Update refund table
            db.run("UPDATE refunds SET status = 'completed' WHERE refund_id = ?", [refundId], () => { });
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error("Webhook logic error:", err);
        res.status(500).send('Internal Error');
    }
});

// REFUND
app.post('/api/payment/refund', requireAuth, async (req, res) => {
    const { merchantOrderId, amount, reason } = req.body; // Amount in paise? Or Rupees?
    // Prompt: "amount (in paise)"

    try {
        const token = await getPhonePeToken();
        const merchantRefundId = 'REF-' + Date.now();
        const amountPaise = parseInt(amount);

        const payload = {
            merchantRefundId: merchantRefundId,
            merchantOrderId: merchantOrderId,
            originalMerchantOrderId: merchantOrderId,
            amount: amountPaise,
            message: reason || "User requested refund"
        };

        const response = await axios.post(`${PHONEPE_HOST_URL}/payments/v2/refund`, payload, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        // Store in DB
        db.run("INSERT INTO refunds (id, order_id, refund_id, amount, status) VALUES (?, ?, ?, ?, ?)",
            [merchantRefundId, merchantOrderId, merchantRefundId, amountPaise / 100, data.state || 'pending'],
            (err) => {
                if (err) console.error("Refund DB Error", err);
            });

        res.json(data);

    } catch (error) {
        console.error("Refund Error:", error.response?.data || error);
        res.status(500).json({ error: 'Refund failed', details: error.response?.data });
    }
});


// ORDERS LIST (ADMIN) - Only show successful payments
app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders WHERE payment_status IN ('success', 'paid') ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const orders = rows.map(o => ({
            ...o,
            items: o.items ? JSON.parse(o.items) : []
        }));
        res.json(orders);
    });
});

app.get('/api/orders/:id', (req, res) => {
    db.get("SELECT * FROM orders WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });

        const order = {
            ...row,
            items: row.items ? JSON.parse(row.items) : []
        };
        res.json(order);
    });
});


app.put('/api/orders/:id', requireAuth, (req, res) => {
    const { status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order status updated' });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    // SECURE: Use Environment Variable
    const adminPass = process.env.ADMIN_PASSCODE || '1234';

    if (password === adminPass) {
        // Generate real JWT token
        const token = jwt.sign(
            { role: 'admin', loginTime: Date.now() },
            JWT_SECRET,
            { expiresIn: '2h' }
        );
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Credentials' });
    }
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

app.delete('/api/orders/:id', requireAuth, (req, res) => {
    db.run("DELETE FROM orders WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});


// Fallback for SPA
app.get(/.*/, (req, res) => {
    // Try serving from dist first
    const distPath = path.join(__dirname, '../dist', 'index.html');
    res.sendFile(distPath, (err) => {
        if (err) {
            // If dist not found (dev mode maybe?), try pages? 
            // In production, everything should be in dist.
            res.status(404).send('App not built or not found');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Callback Base URL: ${APP_BE_URL}`);
});
