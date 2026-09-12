import express from "express";
import crypto from "crypto";
import { uploadToR2 } from "./billing-r2.js";

export function createBillingRouter(db) {
    const router = express.Router();

    // Helper for DB queries that works with both SQLite and Postgres
    const runQuery = (query, params = []) => {
        return new Promise((resolve, reject) => {
            if (typeof db.all === "function") {
                // SQLite
                if (query.trim().toUpperCase().startsWith("SELECT")) {
                    db.all(query, params, (err, rows) => {
                        if (err) return reject(err);
                        resolve(rows);
                    });
                } else {
                    db.run(query, params, function (err) {
                        if (err) return reject(err);
                        resolve({ lastID: this?.lastID, changes: this?.changes });
                    });
                }
            } else if (typeof db.query === "function") {
                // Postgres
                // Convert ? to $1, $2, etc.
                let paramIndex = 1;
                const pgQuery = query.replace(/\?/g, () => "\$" + paramIndex++);
                db.query(pgQuery, params)
                    .then((result) => resolve(result.rows || result))
                    .catch(reject);
            } else {
                reject(new Error("Unknown database driver"));
            }
        });
    };

    // Initialize Billing Tables
    const initBillingTables = async () => {
        try {
            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_products (
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_invoices (
                    id TEXT PRIMARY KEY,
                    customer_name TEXT,
                    customer_phone TEXT,
                    customer_address TEXT,
                    subtotal REAL NOT NULL,
                    discount REAL DEFAULT 0,
                    gst_rate REAL DEFAULT 0,
                    gst_amount REAL DEFAULT 0,
                    total REAL NOT NULL,
                    payment_method TEXT DEFAULT "CASH",
                    items TEXT NOT NULL,
                    status TEXT DEFAULT "PAID",
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_settings (
                    id INTEGER PRIMARY KEY,
                    store_name TEXT DEFAULT "Indrita Fabrics",
                    tagline TEXT DEFAULT "Tradition in Every Drape",
                    address TEXT DEFAULT "Kolkata, West Bengal, India",
                    phone TEXT DEFAULT "+91 9876543210",
                    gst_number TEXT DEFAULT "19AAAAA0000A1Z5",
                    printer_model TEXT DEFAULT "DEV 2IN1 632-L58P",
                    printer_paper_width INTEGER DEFAULT 58,
                    printer_dpi INTEGER DEFAULT 203,
                    default_gst_rate REAL DEFAULT 18,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // NOTE: Do NOT seed any fake products. The catalog starts 100% clean and real.

            // Seed initial settings if empty
            const existingSettings = await runQuery("SELECT COUNT(*) as count FROM billing_settings");
            const sCount = existingSettings[0]?.count || existingSettings[0]?.COUNT || 0;
            if (parseInt(sCount, 10) === 0) {
                await runQuery(
                    "INSERT INTO billing_settings (id, store_name, tagline, address, phone, gst_number, printer_model, printer_paper_width, printer_dpi, default_gst_rate) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        "Indrita Fabrics",
                        "Tradition in Every Drape",
                        "Main Road, Fabric Market, Kolkata - 700001",
                        "+91 9876543210",
                        "19AAAAA0000A1Z5",
                        "DEV 2IN1 632-L58P",
                        58,
                        203,
                        18
                    ]
                );
                console.log("[BILLING] Initial store settings initialized.");
            }
        } catch (err) {
            console.error("[BILLING] DB Init error:", err);
        }
    };

    initBillingTables();

    // --- R2 PHOTO UPLOAD ---
    router.post("/upload", async (req, res) => {
        try {
            const { image, mimeType, fileName } = req.body;
            if (!image) {
                return res.status(400).json({ error: "Missing image data" });
            }
            const publicUrl = await uploadToR2(image, mimeType || "image/jpeg", fileName);
            res.json({ success: true, url: publicUrl });
        } catch (err) {
            console.error("R2 Upload Route Error:", err);
            res.status(500).json({ error: "Failed to upload image to Cloudflare R2: " + err.message });
        }
    });

    // --- PRODUCTS API ---
    router.get("/products", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_products ORDER BY created_at DESC");
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post("/products", async (req, res) => {
        try {
            const {
                name,
                sku,
                barcode,
                category,
                subcategory,
                price,
                stock,
                description,
                image_url
            } = req.body;

            if (!name || !sku || price === undefined) {
                return res.status(400).json({ error: "Name, SKU and Price are required" });
            }

            const id = "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
            const finalBarcode = barcode || sku || ("890" + Date.now().toString().slice(-10));

            await runQuery(
                "INSERT INTO billing_products (id, name, sku, barcode, category, subcategory, price, stock, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [id, name, sku, finalBarcode, category || "Others", subcategory || "", Number(price), Number(stock || 0), description || "", image_url || ""]
            );

            const created = await runQuery("SELECT * FROM billing_products WHERE id = ?", [id]);
            res.status(201).json(created[0] || { id, name, sku, barcode: finalBarcode, price, stock });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put("/products/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                sku,
                barcode,
                category,
                subcategory,
                price,
                stock,
                description,
                image_url
            } = req.body;

            await runQuery(
                "UPDATE billing_products SET name = ?, sku = ?, barcode = ?, category = ?, subcategory = ?, price = ?, stock = ?, description = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [name, sku, barcode, category, subcategory, Number(price), Number(stock), description, image_url, id]
            );

            const updated = await runQuery("SELECT * FROM billing_products WHERE id = ?", [id]);
            res.json(updated[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete("/products/:id", async (req, res) => {
        try {
            const { id } = req.params;
            await runQuery("DELETE FROM billing_products WHERE id = ?", [id]);
            res.json({ success: true, message: "Product deleted" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- INVOICES API ---
    router.get("/invoices", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_invoices ORDER BY created_at DESC");
            const parsed = rows.map((inv) => {
                try {
                    return { ...inv, items: JSON.parse(inv.items) };
                } catch {
                    return inv;
                }
            });
            res.json(parsed);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post("/invoices", async (req, res) => {
        try {
            const {
                customer_name,
                customer_phone,
                customer_address,
                subtotal,
                discount,
                gst_rate,
                gst_amount,
                total,
                payment_method,
                items,
            } = req.body;

            if (!items || !items.length || total === undefined) {
                return res.status(400).json({ error: "Items and Total are required" });
            }

            const invoiceCountRow = await runQuery("SELECT COUNT(*) as count FROM billing_invoices");
            const nextNum = (parseInt(invoiceCountRow[0]?.count || invoiceCountRow[0]?.COUNT || 0, 10) + 1).toString().padStart(4, "0");
            const d = new Date();
            const dateStr = d.getFullYear() + (d.getMonth() + 1).toString().padStart(2, "0");
            const id = `INV-${dateStr}-${nextNum}`;

            await runQuery(
                "INSERT INTO billing_invoices (id, customer_name, customer_phone, customer_address, subtotal, discount, gst_rate, gst_amount, total, payment_method, items, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    id,
                    customer_name || "Walk-in Customer",
                    customer_phone || "",
                    customer_address || "",
                    Number(subtotal || 0),
                    Number(discount || 0),
                    Number(gst_rate || 0),
                    Number(gst_amount || 0),
                    Number(total || 0),
                    payment_method || "CASH",
                    JSON.stringify(items),
                    "PAID",
                ]
            );

            // Deduct stock for items
            for (const it of items) {
                if (it.id) {
                    await runQuery(
                        "UPDATE billing_products SET stock = MAX(0, stock - ?) WHERE id = ?",
                        [Number(it.qty || 1), it.id]
                    );
                }
            }

            // Save customer if phone provided
            if (customer_phone && customer_phone.trim()) {
                const existingCust = await runQuery("SELECT id FROM billing_customers WHERE phone = ?", [customer_phone.trim()]);
                if (!existingCust.length) {
                    const custId = "c_" + Date.now();
                    await runQuery(
                        "INSERT INTO billing_customers (id, name, phone, address) VALUES (?, ?, ?, ?)",
                        [custId, customer_name || "Customer", customer_phone.trim(), customer_address || ""]
                    );
                }
            }

            const created = await runQuery("SELECT * FROM billing_invoices WHERE id = ?", [id]);
            res.status(201).json({
                ...created[0],
                items: JSON.parse(created[0].items),
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- CUSTOMERS API ---
    router.get("/customers", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_customers ORDER BY created_at DESC");
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post("/customers", async (req, res) => {
        try {
            const { name, phone, email, address } = req.body;
            if (!name) return res.status(400).json({ error: "Customer name required" });
            const id = "c_" + Date.now();
            await runQuery(
                "INSERT INTO billing_customers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)",
                [id, name, phone || "", email || "", address || ""]
            );
            res.status(201).json({ id, name, phone, email, address });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- REPORTS / STATS API ---
    router.get("/reports", async (req, res) => {
        try {
            const invoices = await runQuery("SELECT * FROM billing_invoices ORDER BY created_at DESC");
            let totalRevenue = 0;
            let totalItemsSold = 0;
            const parsedInvoices = invoices.map(inv => {
                totalRevenue += Number(inv.total || 0);
                try {
                    const items = JSON.parse(inv.items);
                    items.forEach(i => totalItemsSold += Number(i.qty || 1));
                    return { ...inv, items };
                } catch {
                    return inv;
                }
            });

            const productsCount = await runQuery("SELECT COUNT(*) as count FROM billing_products");
            const customersCount = await runQuery("SELECT COUNT(*) as count FROM billing_customers");

            res.json({
                totalInvoices: invoices.length,
                totalRevenue,
                totalItemsSold,
                totalProducts: productsCount[0]?.count || 0,
                totalCustomers: customersCount[0]?.count || 0,
                recentInvoices: parsedInvoices.slice(0, 10),
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- SETTINGS API ---
    router.get("/settings", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_settings WHERE id = 1");
            res.json(rows[0] || {
                store_name: "Indrita Fabrics",
                tagline: "Tradition in Every Drape",
                address: "Kolkata, West Bengal, India",
                phone: "+91 9876543210",
                gst_number: "19AAAAA0000A1Z5",
                printer_model: "DEV 2IN1 632-L58P",
                printer_paper_width: 58,
                printer_dpi: 203,
                default_gst_rate: 18,
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post("/settings", async (req, res) => {
        try {
            const {
                store_name,
                tagline,
                address,
                phone,
                gst_number,
                printer_model,
                printer_paper_width,
                printer_dpi,
                default_gst_rate,
            } = req.body;

            await runQuery(
                `UPDATE billing_settings SET 
                    store_name = ?, 
                    tagline = ?, 
                    address = ?, 
                    phone = ?, 
                    gst_number = ?, 
                    printer_model = ?, 
                    printer_paper_width = ?, 
                    printer_dpi = ?, 
                    default_gst_rate = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = 1`,
                [
                    store_name || "Indrita Fabrics",
                    tagline || "Tradition in Every Drape",
                    address || "",
                    phone || "",
                    gst_number || "",
                    printer_model || "DEV 2IN1 632-L58P",
                    Number(printer_paper_width || 58),
                    Number(printer_dpi || 203),
                    Number(default_gst_rate || 18),
                ]
            );

            const updated = await runQuery("SELECT * FROM billing_settings WHERE id = 1");
            res.json(updated[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- CLOUDFLARE R2 STATUS ---
    router.get("/r2-status", async (req, res) => {
        try {
            res.json({
                status: "active",
                bucket: process.env.R2_BUCKET_NAME || "chf-media",
                publicUrl: process.env.R2_PUBLIC_URL || "https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev",
                accountId: (process.env.R2_ACCOUNT_ID || "d098e896b8f7dc0403ad3a16f592dfe6").slice(0, 6) + "...",
                mode: "AWS S3 Signature v4 Direct"
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- CSV EXPORT INVOICES ---
    router.get("/export/invoices-csv", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_invoices ORDER BY created_at DESC");
            let csv = "Invoice ID,Customer,Phone,Items Count,Subtotal,Discount,GST Amount,Total,Payment Mode,Date\n";
            rows.forEach(r => {
                let itemCount = 1;
                try {
                    const items = JSON.parse(r.items);
                    itemCount = items.length;
                } catch {}
                csv += `"${r.id}","${(r.customer_name || '').replace(/"/g, '""')}","${r.customer_phone || ''}",${itemCount},${r.subtotal || 0},${r.discount || 0},${r.gst_amount || 0},${r.total || 0},"${r.payment_method || 'CASH'}","${r.created_at || ''}"\n`;
            });
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=Indrita_Fabrics_Invoices_${Date.now()}.csv`);
            res.send(csv);
        } catch (err) {
            res.status(500).send("Export failed: " + err.message);
        }
    });

    // --- CSV EXPORT PRODUCTS ---
    router.get("/export/products-csv", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_products ORDER BY category ASC, name ASC");
            let csv = "ID,Name,SKU,Barcode,Category,Subcategory,Price,Stock,Description,Image URL\n";
            rows.forEach(p => {
                csv += `"${p.id}","${(p.name || '').replace(/"/g, '""')}","${p.sku || ''}","${p.barcode || ''}","${p.category || ''}","${p.subcategory || ''}",${p.price || 0},${p.stock || 0},"${(p.description || '').replace(/"/g, '""')}","${p.image_url || ''}"\n`;
            });
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=Indrita_Fabrics_Products_${Date.now()}.csv`);
            res.send(csv);
        } catch (err) {
            res.status(500).send("Export failed: " + err.message);
        }
    });

    // --- CLEAR PRODUCTS OR INVOICES ---
    router.post("/clear-data", async (req, res) => {
        try {
            const { target } = req.body; // 'products', 'invoices', 'all'
            if (target === 'products' || target === 'all') {
                await runQuery("DELETE FROM billing_products");
            }
            if (target === 'invoices' || target === 'all') {
                await runQuery("DELETE FROM billing_invoices");
            }
            res.json({ success: true, message: `Successfully cleared ${target}` });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

export default createBillingRouter;
