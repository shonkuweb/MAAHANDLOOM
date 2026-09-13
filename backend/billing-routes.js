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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_categories (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                    payment_method TEXT DEFAULT 'CASH',
                    items TEXT NOT NULL,
                    status TEXT DEFAULT 'PAID',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS billing_settings (
                    id INTEGER PRIMARY KEY,
                    store_name TEXT DEFAULT 'Indrita Fabrics',
                    tagline TEXT DEFAULT 'Tradition in Every Drape',
                    address TEXT DEFAULT 'Kolkata, West Bengal, India',
                    phone TEXT DEFAULT '+91 9876543210',
                    gst_number TEXT DEFAULT '19AAAAA0000A1Z5',
                    printer_model TEXT DEFAULT 'DEV 2IN1 632-L58P',
                    printer_paper_width INTEGER DEFAULT 58,
                    printer_dpi INTEGER DEFAULT 203,
                    default_gst_rate REAL DEFAULT 18,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // NOTE: Do NOT seed any hardcoded categories or fake products. The catalog starts 100% clean.

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

    let tablesReady = false;
    router.use(async (req, res, next) => {
        if (!tablesReady) {
            try {
                await initBillingTables();
                tablesReady = true;
            } catch (err) {
                console.error("[BILLING] Table ensure error:", err);
            }
        }
        next();
    });

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

    // --- CATEGORIES API ---
    router.get("/categories", async (req, res) => {
        try {
            const rows = await runQuery("SELECT * FROM billing_categories ORDER BY name ASC");
            const prodCats = await runQuery("SELECT DISTINCT category FROM billing_products WHERE category IS NOT NULL AND category != ''");
            const existingNames = new Set((rows || []).map((r) => (r.name || "").toLowerCase()));

            const categories = [...(rows || [])];
            for (const pc of prodCats || []) {
                if (pc.category && !existingNames.has(pc.category.toLowerCase())) {
                    categories.push({
                        id: "cat_prod_" + Buffer.from(pc.category).toString("hex").slice(0, 8),
                        name: pc.category,
                        created_at: new Date().toISOString()
                    });
                    existingNames.add(pc.category.toLowerCase());
                }
            }
            res.json(categories);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post("/categories", async (req, res) => {
        try {
            const { name } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: "Category name is required" });
            }
            const trimmed = name.trim();
            const existing = await runQuery("SELECT * FROM billing_categories WHERE LOWER(name) = LOWER(?)", [trimmed]);
            if (existing && existing.length > 0) {
                return res.json(existing[0]);
            }
            const id = "cat_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
            await runQuery("INSERT INTO billing_categories (id, name) VALUES (?, ?)", [id, trimmed]);
            const created = await runQuery("SELECT * FROM billing_categories WHERE id = ?", [id]);
            res.status(201).json(created[0] || { id, name: trimmed });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete("/categories/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const catRows = await runQuery("SELECT name FROM billing_categories WHERE id = ? OR LOWER(name) = LOWER(?)", [id, id]);
            const catName = catRows[0]?.name || id;
            await runQuery("DELETE FROM billing_categories WHERE id = ? OR LOWER(name) = LOWER(?)", [id, id]);
            await runQuery("UPDATE billing_products SET category = '' WHERE LOWER(category) = LOWER(?)", [catName]);
            res.json({ success: true, message: "Category deleted" });
        } catch (err) {
            res.status(500).json({ error: err.message });
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
                [id, name, sku, finalBarcode, category || "", subcategory || "", Number(price), Number(stock || 0), description || "", image_url || ""]
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

    // --- EXECUTIVE A4 PDF EXPORT: INVOICES REPORT ---
    router.get("/export/invoices-pdf", async (req, res) => {
        try {
            const invoices = await runQuery("SELECT * FROM billing_invoices ORDER BY created_at DESC");
            const settingsRows = await runQuery("SELECT * FROM billing_settings WHERE id = 1");
            const settings = settingsRows[0] || {
                store_name: "Indrita Fabrics",
                tagline: "Tradition in Every Drape",
                address: "Main Road, Fabric Market, Kolkata - 700001",
                phone: "+91 9876543210",
                gst_number: "19AAAAA0000A1Z5"
            };

            let grandTotal = 0;
            let totalGst = 0;
            let totalItemsSold = 0;

            const tableRows = invoices.map((inv, idx) => {
                grandTotal += Number(inv.total || 0);
                totalGst += Number(inv.gst_amount || 0);
                let itemsList = [];
                try {
                    itemsList = JSON.parse(inv.items);
                    itemsList.forEach(it => totalItemsSold += Number(it.qty || 1));
                } catch {}

                const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "-";
                const itemsSummary = itemsList.map(it => `${it.qty || 1}x ${it.name} (₹${it.price})`).join("<br>");

                return `
                    <tr>
                        <td style="text-align:center; font-weight:700;">${idx + 1}</td>
                        <td>
                            <strong style="color:#0F5132;">${inv.id}</strong><br>
                            <span style="font-size:10px; color:#64748B;">${dateStr}</span>
                        </td>
                        <td>
                            <strong>${inv.customer_name || "Walk-in Customer"}</strong><br>
                            <span style="font-size:10px; color:#64748B;">${inv.customer_phone || "-"}</span>
                        </td>
                        <td style="font-size:11px; color:#334155;">${itemsSummary || "1x Items"}</td>
                        <td style="text-align:center;">
                            <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; background:#ECFDF5; color:#065F46;">
                                ${inv.payment_method || "CASH"}
                            </span>
                        </td>
                        <td style="text-align:right;">₹ ${(inv.gst_amount || 0).toLocaleString("en-IN")}</td>
                        <td style="text-align:right; font-weight:800; color:#0F172A;">₹ ${(inv.total || 0).toLocaleString("en-IN")}</td>
                    </tr>
                `;
            }).join("");

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoices Report - ${settings.store_name}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 15mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            background: #FFF;
            padding: 10px;
            font-size: 12px;
            line-height: 1.4;
        }
        .header-wrap {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0F5132;
            padding-bottom: 14px;
            margin-bottom: 16px;
        }
        .store-brand h1 {
            font-size: 24px;
            font-weight: 900;
            color: #0F5132;
            letter-spacing: -0.5px;
        }
        .store-brand p {
            font-size: 11px;
            color: #64748B;
            margin-top: 2px;
        }
        .report-meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
        }
        .report-meta .doc-title {
            font-size: 16px;
            font-weight: 800;
            color: #1E293B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }
        .kpi-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 8px 12px;
        }
        .kpi-label { font-size: 10px; color: #64748B; text-transform: uppercase; font-weight: 700; }
        .kpi-value { font-size: 16px; font-weight: 900; color: #0F5132; margin-top: 2px; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 16px;
        }
        th {
            background: #0F5132;
            color: #FFFFFF;
            text-align: left;
            padding: 8px 10px;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: top;
        }
        tr:nth-child(even) td { background: #FAFAFA; }
        .footer-note {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #E2E8F0;
            font-size: 10px;
            color: #94A3B8;
        }
        .signature-box {
            text-align: center;
            width: 160px;
            border-top: 1px solid #0F172A;
            padding-top: 4px;
            font-weight: 700;
            color: #0F172A;
        }
        .no-print-bar {
            position: sticky;
            top: 0;
            background: #1E293B;
            color: white;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 6px;
            margin-bottom: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .btn-print-now {
            background: #10B981;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            font-weight: 700;
            cursor: pointer;
        }
        @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0 !important; }
        }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span>📄 <strong>Sales & Invoices Executive Report</strong> (${invoices.length} invoices)</span>
        <button class="btn-print-now" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="header-wrap">
        <div class="store-brand">
            <h1>${settings.store_name}</h1>
            <p>${settings.tagline || ""}</p>
            <p style="margin-top:4px;">${settings.address || ""} | Ph: ${settings.phone || ""}</p>
            ${settings.gst_number ? `<p><strong>GSTIN:</strong> ${settings.gst_number}</p>` : ""}
        </div>
        <div class="report-meta">
            <div class="doc-title">Sales Audit Statement</div>
            <p>Generated: ${new Date().toLocaleString("en-IN")}</p>
            <p>Scope: Complete History</p>
        </div>
    </div>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">Total Invoices</div>
            <div class="kpi-value">${invoices.length}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Items Sold</div>
            <div class="kpi-value">${totalItemsSold}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total GST Tax</div>
            <div class="kpi-value">₹ ${totalGst.toLocaleString("en-IN")}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-value">₹ ${grandTotal.toLocaleString("en-IN")}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:30px; text-align:center;">#</th>
                <th style="width:110px;">Invoice & Date</th>
                <th style="width:130px;">Customer</th>
                <th>Items Breakdown</th>
                <th style="width:70px; text-align:center;">Payment</th>
                <th style="width:80px; text-align:right;">GST</th>
                <th style="width:90px; text-align:right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows || `<tr><td colspan="7" style="text-align:center; padding:20px; color:#94A3B8;">No invoices on record.</td></tr>`}
        </tbody>
    </table>

    <div class="footer-note">
        <div>
            <p>This is a computer-generated tax & sales statement for ${settings.store_name}.</p>
            <p>Page 1 of 1 • Internal Audit Copy</p>
        </div>
        <div class="signature-box">
            Authorized Signatory
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>
            `;

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.send(html);
        } catch (err) {
            res.status(500).send("PDF Report Generation failed: " + err.message);
        }
    });

    // --- EXECUTIVE A4 PDF EXPORT: PRODUCTS CATALOG INVENTORY ---
    router.get("/export/products-pdf", async (req, res) => {
        try {
            const products = await runQuery("SELECT * FROM billing_products ORDER BY category ASC, name ASC");
            const settingsRows = await runQuery("SELECT * FROM billing_settings WHERE id = 1");
            const settings = settingsRows[0] || {
                store_name: "Indrita Fabrics",
                tagline: "Tradition in Every Drape",
                address: "Main Road, Fabric Market, Kolkata - 700001",
                phone: "+91 9876543210",
                gst_number: "19AAAAA0000A1Z5"
            };

            let totalStockQty = 0;
            let totalValuation = 0;
            const distinctCategories = new Set();

            const tableRows = products.map((p, idx) => {
                const stock = Number(p.stock || 0);
                const price = Number(p.price || 0);
                const itemVal = stock * price;
                totalStockQty += stock;
                totalValuation += itemVal;
                if (p.category) distinctCategories.add(p.category);

                return `
                    <tr>
                        <td style="text-align:center; font-weight:700;">${idx + 1}</td>
                        <td style="width:40px; text-align:center;">
                            ${p.image_url ? `<img src="${p.image_url}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid #E2E8F0;" alt="item">` : `<div style="width:36px; height:36px; background:#F1F5F9; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; font-size:9px; color:#94A3B8;">No Img</div>`}
                        </td>
                        <td>
                            <strong>${p.name}</strong><br>
                            <span style="font-size:10px; color:#64748B;">SKU: ${p.sku || "-"} | Barcode: ${p.barcode || "-"}</span>
                        </td>
                        <td>
                            <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; background:#F1F5F9; color:#334155;">
                                ${p.category || "General"}
                            </span>
                            ${p.subcategory ? `<br><span style="font-size:10px; color:#64748B;">${p.subcategory}</span>` : ""}
                        </td>
                        <td style="text-align:center; font-weight:700;">${stock}</td>
                        <td style="text-align:right; font-weight:700;">₹ ${price.toLocaleString("en-IN")}</td>
                        <td style="text-align:right; font-weight:800; color:#0F5132;">₹ ${itemVal.toLocaleString("en-IN")}</td>
                    </tr>
                `;
            }).join("");

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Inventory Audit Statement - ${settings.store_name}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 15mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            background: #FFF;
            padding: 10px;
            font-size: 12px;
            line-height: 1.4;
        }
        .header-wrap {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0F5132;
            padding-bottom: 14px;
            margin-bottom: 16px;
        }
        .store-brand h1 {
            font-size: 24px;
            font-weight: 900;
            color: #0F5132;
            letter-spacing: -0.5px;
        }
        .store-brand p {
            font-size: 11px;
            color: #64748B;
            margin-top: 2px;
        }
        .report-meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
        }
        .report-meta .doc-title {
            font-size: 16px;
            font-weight: 800;
            color: #1E293B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }
        .kpi-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 8px 12px;
        }
        .kpi-label { font-size: 10px; color: #64748B; text-transform: uppercase; font-weight: 700; }
        .kpi-value { font-size: 16px; font-weight: 900; color: #0F5132; margin-top: 2px; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 16px;
        }
        th {
            background: #0F5132;
            color: #FFFFFF;
            text-align: left;
            padding: 8px 10px;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: middle;
        }
        tr:nth-child(even) td { background: #FAFAFA; }
        .footer-note {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #E2E8F0;
            font-size: 10px;
            color: #94A3B8;
        }
        .signature-box {
            text-align: center;
            width: 160px;
            border-top: 1px solid #0F172A;
            padding-top: 4px;
            font-weight: 700;
            color: #0F172A;
        }
        .no-print-bar {
            position: sticky;
            top: 0;
            background: #1E293B;
            color: white;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 6px;
            margin-bottom: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .btn-print-now {
            background: #10B981;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            font-weight: 700;
            cursor: pointer;
        }
        @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0 !important; }
        }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span>📦 <strong>Product Catalog & Inventory Valuation</strong> (${products.length} products)</span>
        <button class="btn-print-now" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="header-wrap">
        <div class="store-brand">
            <h1>${settings.store_name}</h1>
            <p>${settings.tagline || ""}</p>
            <p style="margin-top:4px;">${settings.address || ""} | Ph: ${settings.phone || ""}</p>
            ${settings.gst_number ? `<p><strong>GSTIN:</strong> ${settings.gst_number}</p>` : ""}
        </div>
        <div class="report-meta">
            <div class="doc-title">Inventory Valuation Audit</div>
            <p>Generated: ${new Date().toLocaleString("en-IN")}</p>
            <p>Active SKUs: ${products.length}</p>
        </div>
    </div>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">Total SKUs</div>
            <div class="kpi-value">${products.length}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total Units in Stock</div>
            <div class="kpi-value">${totalStockQty}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Unique Categories</div>
            <div class="kpi-value">${distinctCategories.size}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Stock Valuation</div>
            <div class="kpi-value">₹ ${totalValuation.toLocaleString("en-IN")}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:30px; text-align:center;">#</th>
                <th style="width:40px; text-align:center;">Img</th>
                <th>Product Name & Codes</th>
                <th style="width:130px;">Category</th>
                <th style="width:70px; text-align:center;">In Stock</th>
                <th style="width:90px; text-align:right;">Unit Price</th>
                <th style="width:110px; text-align:right;">Total Valuation</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows || `<tr><td colspan="7" style="text-align:center; padding:20px; color:#94A3B8;">No products in catalog.</td></tr>`}
        </tbody>
    </table>

    <div class="footer-note">
        <div>
            <p>This is a computer-generated stock & inventory statement for ${settings.store_name}.</p>
            <p>Page 1 of 1 • Internal Audit Copy</p>
        </div>
        <div class="signature-box">
            Authorized Signatory
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>
            `;

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.send(html);
        } catch (err) {
            res.status(500).send("PDF Report Generation failed: " + err.message);
        }
    });

    // --- CLEAR PRODUCTS OR INVOICES ---
    router.post("/clear-data", async (req, res) => {
        try {
            const { target } = req.body; // 'products', 'invoices', 'categories', 'all'
            if (target === 'products' || target === 'all') {
                await runQuery("DELETE FROM billing_products");
            }
            if (target === 'categories' || target === 'all') {
                await runQuery("DELETE FROM billing_categories");
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
