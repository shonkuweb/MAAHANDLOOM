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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

// --- STATIC FILES ---
// Static files
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/assets', express.static(path.join(__dirname, '../dist/assets'))); // Explicit for Vite
app.use('/images', express.static(path.join(__dirname, '../public/images')));

app.get('/admin-login', (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const filePath = isProd
        ? path.join(__dirname, '../dist/pages/admin-login.html')
        : path.join(__dirname, '../pages/admin-login.html');

    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send('Admin Login not found. Check build.');
    });
});

app.get('/admin', (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const filePath = isProd
        ? path.join(__dirname, '../dist/pages/admin.html')
        : path.join(__dirname, '../pages/admin.html');

    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send('Admin Panel not found. Check build.');
    });
});

// Token verification endpoint
app.get('/api/auth/verify', requireAuth, (req, res) => {
    res.json({ valid: true, role: req.admin.role });
});


// --- PHONEPE V2 CONFIGURATION ---
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || 1;
const PHONEPE_ENV = (process.env.PHONEPE_ENV || 'SANDBOX').trim();

// STRICT URL CONSTRUCTION LOGIC
const PHONEPE_BASE_URL = PHONEPE_ENV === 'PRODUCTION'
    ? "https://api.phonepe.com"
    : "https://api-preprod.phonepe.com";

const PHONEPE_API_PATH = PHONEPE_ENV === 'PRODUCTION'
    ? "/apis/pg/checkout/v2"
    : "/apis/pg-sandbox/checkout/v2";


const APP_BE_URL = process.env.APP_BE_URL || `http://localhost:${PORT}`;

// Auth Token Cache
let phonePeAccessToken = null;
let phonePeTokenExpiry = null;

async function getPhonePeToken() {
    if (phonePeAccessToken && phonePeTokenExpiry && Date.now() < phonePeTokenExpiry) {
        return phonePeAccessToken;
    }

    try {
        // STRICT V2 RULE: Send client_id and client_secret in BODY
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', PHONEPE_CLIENT_ID);
        params.append('client_secret', PHONEPE_CLIENT_SECRET);
        params.append('client_version', PHONEPE_CLIENT_VERSION);

        // V2 OAuth Token Endpoint
        const tokenUrl = PHONEPE_ENV === 'PRODUCTION'
            ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
            : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";


        console.log("----------------------------------------------------");
        console.log(`PHONEPE ENVIRONMENT: ${PHONEPE_ENV}`);
        console.log(`Using Client ID: ${PHONEPE_CLIENT_ID}`);
        console.log(`Using Token URL: ${tokenUrl}`);
        console.log("----------------------------------------------------");
        console.log("Fetching Token from:", tokenUrl);

        const response = await axios.post(tokenUrl, params, {
            headers: {
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
                images: (p.images && p.images !== 'null') ? JSON.parse(p.images) : [],
                colors: (p.colors && p.colors !== 'null') ? JSON.parse(p.colors) : []
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
    const { id, name, description, price, category, subcategory, colors, qty, image, images } = req.body;
    const finalId = id || 'P' + Date.now();
    const imagesStr = JSON.stringify(images || []);
    const colorsStr = JSON.stringify(colors || []);

    db.get("SELECT id FROM products WHERE id = ?", [finalId], (err, row) => {
        if (row) {
            const sql = `UPDATE products SET name = ?, description = ?, price = ?, category = ?, subcategory = ?, colors = ?, qty = ?, image = ?, images = ? WHERE id = ?`;
            db.run(sql, [name, description, price, category, subcategory, colorsStr, qty, image, imagesStr, finalId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product updated', id: finalId });
            });
        } else {
            const sql = `INSERT INTO products (id, name, description, price, category, subcategory, colors, qty, image, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [finalId, name, description, price, category, subcategory, colorsStr, qty, image, imagesStr], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product created', id: finalId });
            });
        }
    });
});

app.put('/api/products/:id', requireAuth, (req, res) => {
    const { name, description, price, category, subcategory, colors, qty, image, images } = req.body;
    const finalId = req.params.id;
    const imagesStr = JSON.stringify(images || []);
    const colorsStr = JSON.stringify(colors || []);

    const sql = `UPDATE products SET name = ?, description = ?, price = ?, category = ?, subcategory = ?, colors = ?, qty = ?, image = ?, images = ? WHERE id = ?`;
    db.run(sql, [name, description, price, category, subcategory, colorsStr, qty, image, imagesStr, finalId], function (err) {
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
                db.get("SELECT id, name, price, qty, colors FROM products WHERE id = ?", [item.id], (err, row) => {
                    if (err) reject(err);
                    else {
                        console.log(`Product lookup for ${item.id}:`, row);
                        if (row && row.colors && row.colors !== 'null') {
                            row.colors = JSON.parse(row.colors);
                        } else if (row) {
                            row.colors = [];
                        }
                        resolve(row);
                    }
                });
            });

            if (!product) return res.status(400).json({ error: `Product ${item.id} not found` });

            let stockToCheck = product.qty;
            if (item.color && product.colors) {
                const variant = product.colors.find(c => c.colorName === item.color.name);
                if (variant) stockToCheck = variant.qty;
            }

            if (stockToCheck < item.qty) return res.status(400).json({ error: `Insufficient stock for ${product.name} ${item.color ? '(' + item.color.name + ')' : ''}` });

            const itemTotal = product.price * item.qty;
            calculatedTotal += itemTotal;
            verifiedItems.push({
                id: product.id,
                name: product.name,
                qty: item.qty,
                price: product.price,
                color: item.color || null
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

        const merchantTransactionId = merchantOrderId;
        const merchantUserId = 'MUID-' + phone;

        const payload = {
            merchantOrderId: merchantOrderId,
            amount: amountPaise,
            paymentFlow: {
                type: "PG_CHECKOUT",
                merchantUrls: {
                    redirectUrl: `${APP_BE_URL}/api/payment/callback?orderId=${merchantOrderId}`
                }
            }
        };


        console.log("PhonePe Payment Payload:", JSON.stringify(payload, null, 2));

        // CONSTRUCT FINAL URL
        const paymentUrl = `${PHONEPE_BASE_URL}${PHONEPE_API_PATH}/pay`;
        console.log("PHONEPE FINAL PAYMENT URL:", paymentUrl);

        const response = await axios.post(paymentUrl, payload, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        // IMPORTANT: Log full response for debugging
        console.log("FULL PHONEPE CREATE ORDER RESPONSE:", JSON.stringify(data, null, 2));

        // STRICT URL EXTRACTION
        let checkoutUrl = data.redirectUrl;


        if (!checkoutUrl) {
            console.error("Failed to generate checkout URL. redirectUrl is missing.");
            console.error("Full Response:", JSON.stringify(data, null, 2));
            return res.status(500).json({ error: 'Payment initialization failed', details: 'No redirect URL from PhonePe', rawResponse: data });
        }

        console.log("Generated PhonePe Checkout URL:", checkoutUrl);

        // SEND URL TO FRONTEND FOR SDK (Don't redirect here)
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

// HELPER: Decrement Stock on Success
async function decrementStock(orderId) {
    try {
        const order = await new Promise((resolve, reject) => {
            db.get("SELECT items FROM orders WHERE id = ?", [orderId], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!order || !order.items) return;

        const items = JSON.parse(order.items);
        for (const item of items) {
            const product = await new Promise((resolve, reject) => {
                db.get("SELECT id, qty, colors FROM products WHERE id = ?", [item.id], (err, row) => err ? reject(err) : resolve(row));
            });

            if (!product) continue;

            let updatedColorsStr = product.colors;
            let updatedQty = product.qty - item.qty;
            if (updatedQty < 0) updatedQty = 0;

            if (item.color && product.colors && product.colors !== 'null') {
                try {
                    const parsedColors = JSON.parse(product.colors);
                    let colorFound = false;
                    const newColors = parsedColors.map(c => {
                        if (c.colorName === item.color.name) {
                            colorFound = true;
                            let newCqty = (Number(c.qty) || 0) - item.qty;
                            return { ...c, qty: Math.max(0, newCqty) };
                        }
                        return c;
                    });

                    if (colorFound) {
                        updatedColorsStr = JSON.stringify(newColors);
                    }
                } catch (e) {
                    console.error("Error parsing product colors during stock decrement", e);
                }
            }

            await new Promise((resolve, reject) => {
                db.run("UPDATE products SET qty = ?, colors = ? WHERE id = ?", [updatedQty, updatedColorsStr, item.id], (err) => err ? reject(err) : resolve());
            });
        }
        console.log(`Stock decremented successfully for order ${orderId}`);
    } catch (e) {
        console.error(`Failed to decrement stock for order ${orderId}:`, e);
    }
}


// CALLBACK HANDLER
app.all('/api/payment/callback', async (req, res) => {
    console.log("Payment Callback Received:", req.method, "Query:", req.query, "Body:", req.body);

    // 1. Extract Order ID
    let merchantOrderId = req.query.orderId || req.body.merchantOrderId || req.body.transactionId;

    if (!merchantOrderId) {
        console.error("Callback Error: Missing merchantOrderId");
        return res.redirect('/?payment=failed&reason=missing_order_id');
    }

    console.log(`Verifying Payment for Order: ${merchantOrderId}`);

    // Check if we already processed it
    const existingOrder = await new Promise((resolve, reject) => {
        db.get("SELECT payment_status FROM orders WHERE id = ?", [merchantOrderId], (err, row) => err ? reject(err) : resolve(row));
    }).catch(e => null);

    if (existingOrder && existingOrder.payment_status === 'success') {
        console.log(`Order ${merchantOrderId} already processed previously.`);
        return res.redirect(`/order-confirmation?status=success&orderId=${merchantOrderId}`);
    }

    // 2. Call PhonePe Status API (Source of Truth)
    try {
        const token = await getPhonePeToken();

        // CONSTRUCT STATUS URL
        const statusUrl = `${PHONEPE_BASE_URL}${PHONEPE_API_PATH}/order/${merchantOrderId}/status`;

        console.log("PHONEPE FINAL STATUS URL:", statusUrl);

        const statusResponse = await axios.get(statusUrl, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const statusData = statusResponse.data;
        console.log("PhonePe Status API Response:", JSON.stringify(statusData, null, 2));

        if (statusData.state === 'COMPLETED') {
            // 3. Update Database (Success)
            console.log("Payment COMPLETED. Updating DB...");
            await new Promise((resolve, reject) => {
                db.run("UPDATE orders SET payment_status = 'success', status = 'new' WHERE id = ?", [merchantOrderId], (err) => err ? reject(err) : resolve());
            });
            await decrementStock(merchantOrderId);
            return res.redirect(`/order-confirmation?status=success&orderId=${merchantOrderId}`);
        } else if (statusData.state === 'FAILED') {
            console.log("Payment FAILED. Updating DB...");
            db.run("UPDATE orders SET payment_status = 'failed', status = 'cancelled' WHERE id = ?", [merchantOrderId], () => { });
            return res.redirect(`/order-confirmation?status=failed&orderId=${merchantOrderId}`);
        } else {
            // PENDING
            console.log(`Payment State: ${statusData.state}. Redirecting to pending.`);
            return res.redirect(`/order-confirmation?status=pending&orderId=${merchantOrderId}`);
        }

    } catch (e) {
        console.error("Callback verification failed (Status API Error)", e.response?.data || e.message);
        return res.redirect(`/order-confirmation?status=pending&orderId=${merchantOrderId}&error=verification_failed`);
    }
});

// PAYMENT STATUS CHECK
app.get('/api/payment/status/:merchantOrderId', async (req, res) => {
    const { merchantOrderId } = req.params;

    try {
        const token = await getPhonePeToken();

        // CONSTRUCT STATUS URL
        const statusUrl = `${PHONEPE_BASE_URL}${PHONEPE_API_PATH}/order/${merchantOrderId}/status`;

        console.log("PHONEPE FINAL STATUS URL (Manual Check):", statusUrl);

        const response = await axios.get(statusUrl, {
            headers: {
                'Authorization': `O-Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-MERCHANT-ID': 'SU2602141521026654980820'
            }
        });

        const data = response.data;
        const state = data.state;

        // Check current DB status to avoid double-processing stock
        const existingOrder = await new Promise((resolve, reject) => {
            db.get("SELECT payment_status FROM orders WHERE id = ?", [merchantOrderId], (err, row) => err ? reject(err) : resolve(row));
        }).catch(e => null);

        let dbStatus = 'pending';
        let paymentStatus = 'pending';

        if (state === 'COMPLETED' || state === 'SUCCEEDED') {
            dbStatus = 'new';
            paymentStatus = 'success';
        } else if (state === 'FAILED') {
            dbStatus = 'cancelled';
            paymentStatus = 'failed';
        }

        if (state) {
            await new Promise((resolve, reject) => {
                db.run("UPDATE orders SET payment_status = ?, status = ? WHERE id = ?", [paymentStatus, dbStatus, merchantOrderId], (err) => err ? reject(err) : resolve());
            });

            // Only decrement stock if we newly discovered success
            if (paymentStatus === 'success' && existingOrder && existingOrder.payment_status !== 'success') {
                await decrementStock(merchantOrderId);
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
    // Basic Auth Check (User Defined Custom Rule: SHA256(username:password))
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Unauthorized');

    const username = process.env.PHONEPE_WEBHOOK_USERNAME;
    const password = process.env.PHONEPE_WEBHOOK_PASSWORD;

    // Construct expected hash: SHA256(username:password)
    const dataToHash = `${username}:${password}`;
    const expectedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // User might send "Basic <hash>" or just "<hash>" or "Bearer <hash>"? 
    // The rule says "Verify Authorization header: SHA256(username:password)".
    // Usually this means the client sends the hash directly or with Basic.
    // I will assume it sends raw hash or I need to match strictly.
    // Let's check strict equality first, then try with 'Basic ' prefix if that fails.

    // NOTE: If the user meant "Standard Basic Auth where the credentials are username:password", 
    // that would be base64. But they explicitly said SHA256. 
    // Let's implement flexible check to be safe: check if header *contains* the hash.

    const isValid = authHeader === expectedHash || authHeader === `Basic ${expectedHash}` || authHeader === `Bearer ${expectedHash}`;

    if (!isValid) {
        console.error("Webhook Auth Failed. Header:", authHeader, "Expected Hash of:", dataToHash);
        return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    console.log("Webhook Received:", JSON.stringify(event));

    try {
        if (event.state === 'COMPLETED' || event.state === 'SUCCEEDED') {
            // Note: V2 Webhook structure might be flat or nested. 
            // V2 Docs usually say payload is base64 encoded string in 'response' field if using X-VERIFY.
            // BUT, if this is a custom webhook setup, it might be JSON.
            // User provided "Use payload.state (root-level)" => JSON.

            const content = event.content || event; // Fallback
            const orderId = content.merchantOrderId || content.transactionId;

            if (orderId) {
                db.run("UPDATE orders SET payment_status = 'success', status = 'new' WHERE id = ?", [orderId], (err) => {
                    if (!err) {
                        // Deduct stock here too
                        console.log(`Order ${orderId} marked success via Webhook`);
                    }
                });
            }
        }
        // Handle Refund etc.
        else if (event.type === 'pg.refund.completed' || (event.content && event.content.type === 'pg.refund.completed')) { // Defensive
            // ...
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error("Webhook logic error:", err);
        res.status(500).send('Internal Error');
    }
});

// REFUND
app.post('/api/payment/refund', requireAuth, async (req, res) => {
    const { merchantOrderId, amount, reason } = req.body;

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

        const response = await axios.post(`${PHONEPE_BASE_URL}/payments/v2/refund`, payload, {
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


// ORDERS LIST (ADMIN) - Only show orders with confirmed payment
app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders WHERE payment_status = 'success' ORDER BY created_at DESC", [], (err, rows) => {
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

    if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
    }

    // Default fallback from ENV in case DB is still initializing or seeding failed
    const fallbackPassword = process.env.ADMIN_PASSCODE || 'admin123';

    db.get('SELECT passcode FROM admin_settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
        let validPassword = fallbackPassword;

        if (err) {
            console.error("Login DB Error (falling back to ENV):", err.message);
        } else if (row && row.passcode) {
            validPassword = row.passcode;
        } else {
            console.warn("Admin settings not initialized yet (falling back to ENV).");
        }

        if (password === validPassword) {
            const token = jwt.sign(
                { role: 'admin', loginTime: Date.now() },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ success: true, token });
        } else {
            return res.status(401).json({ success: false, error: 'Invalid passcode' });
        }
    });
});

app.put('/api/admin/password', requireAuth, (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Both current and new passwords are required' });
    }

    db.get('SELECT id, passcode FROM admin_settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });
        if (!row) return res.status(500).json({ success: false, error: 'Admin settings not initialized' });

        if (oldPassword !== row.passcode) {
            return res.status(401).json({ success: false, error: 'Incorrect current password' });
        }

        db.run('UPDATE admin_settings SET passcode = ? WHERE id = ?', [newPassword, row.id], (err) => {
            if (err) return res.status(500).json({ success: false, error: 'Failed to update password' });
            res.json({ success: true, message: 'Password updated successfully' });
        });
    });
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
