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

            // Seed initial products if empty to match the user screenshot catalogue perfectly
            const existingProducts = await runQuery("SELECT COUNT(*) as count FROM billing_products");
            const count = existingProducts[0]?.count || existingProducts[0]?.COUNT || 0;
            
            if (parseInt(count, 10) === 0) {
                const initialProducts = [
                    {
                        id: "p_" + Date.now() + "_1",
                        name: "Kanchipuram Silk Saree",
                        sku: "KS00123",
                        barcode: "8901234567890",
                        category: "Sarees",
                        subcategory: "Silk",
                        price: 8950,
                        stock: 12,
                        description: "Authentic Kanchipuram pure silk saree with traditional rich zari border and contrast pallu.",
                        image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80"
                    },
                    {
                        id: "p_" + Date.now() + "_2",
                        name: "Banarasi Saree",
                        sku: "BS01456",
                        barcode: "8901234567891",
                        category: "Sarees",
                        subcategory: "Banarasi",
                        price: 6750,
                        stock: 8,
                        description: "Exquisite Banarasi woven silk saree featuring royal brocade motifs and lustrous finish.",
                        image_url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80"
                    },
                    {
                        id: "p_" + Date.now() + "_3",
                        name: "Cotton Saree",
                        sku: "CS07890",
                        barcode: "8901234567892",
                        category: "Sarees",
                        subcategory: "Cotton",
                        price: 2480,
                        stock: 25,
                        description: "Premium breathable pure handloom cotton saree with contrast ethnic woven border.",
                        image_url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=400&q=80"
                    },
                    {
                        id: "p_" + Date.now() + "_4",
                        name: "Tussar Silk Saree",
                        sku: "TS00987",
                        barcode: "8901234567893",
                        category: "Sarees",
                        subcategory: "Tussar",
                        price: 5920,
                        stock: 6,
                        description: "Natural textured Tussar wild silk saree with artistic handcrafted hand-painted floral motifs.",
                        image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80"
                    },
                    {
                        id: "p_" + Date.now() + "_5",
                        name: "Georgette Saree",
                        sku: "GS00421",
                        barcode: "8901234567894",
                        category: "Sarees",
                        subcategory: "Georgette",
                        price: 3850,
                        stock: 14,
                        description: "Lightweight graceful pure Georgette saree adorned with delicate all-over sequins work.",
                        image_url: "https://images.unsplash.com/photo-1610030469668-93530c77658f?auto=format&fit=crop&w=400&q=80"
                    },
                    {
                        id: "p_" + Date.now() + "_6",
                        name: "Chanderi Silk Dupatta",
                        sku: "DP00312",
                        barcode: "8901234567895",
                        category: "Dupattas",
                        subcategory: "Chanderi",
                        price: 1850,
                        stock: 18,
                        description: "Handwoven shimmering Chanderi silk dupatta with subtle gold zari borders.",
                        image_url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=400&q=80"
                    },
                    {
                        id: "p_" + Date.now() + "_7",
                        name: "Anarkali Suit Set",
                        sku: "ST00891",
                        barcode: "8901234567896",
                        category: "Suits",
                        subcategory: "Anarkali",
                        price: 4500,
                        stock: 9,
                        description: "Floor length designer Anarkali ethnic suit with embroidered dupatta and churidar.",
                        image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80"
                    }
                ];

                for (const p of initialProducts) {
                    await runQuery(
                        "INSERT INTO billing_products (id, name, sku, barcode, category, subcategory, price, stock, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [p.id, p.name, p.sku, p.barcode, p.category, p.subcategory, p.price, p.stock, p.description, p.image_url]
                    );
                }
                console.log("[BILLING] Initial products catalog seeded.");
            }

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
                console.log("[BILLING] Initial store settings seeded.");
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

    return router;
}

export default createBillingRouter;
