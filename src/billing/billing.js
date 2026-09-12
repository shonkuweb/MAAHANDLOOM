// INDRITA FABRICS - BILLING POS & DEV 2IN1 THERMAL PRINTER SYSTEM
// Model: 632-L58P (203 DPI, 58mm Width)

// --- STATE ---
const state = {
    currentView: "home",
    products: [],
    filteredProducts: [],
    cart: [],
    selectedCustomer: null,
    currentCategory: "All",
    searchQuery: "",
    isGstEnabled: true,
    gstRate: 18,
    discountAmount: 0,
    storeSettings: {
        store_name: "Indrita Fabrics",
        tagline: "Tradition in Every Drape",
        phone: "+91 9876543210",
        address: "Main Road, Kolkata, WB - 700001",
        gst_number: "19AAAAA0000A1Z5",
        printer_model: "DEV 2IN1 632-L58P",
        printer_paper_width: 58,
        printer_dpi: 203,
    },
    printer: {
        isConnected: true,
        device: null,
        server: null,
        characteristic: null,
        mode: "bluetooth",
    },
    scanner: {
        stream: null,
        isScanning: false,
        barcodeDetector: null,
        isTorchOn: false,
        lastScannedCode: null,
        lastScanTime: 0,
    }
};

// --- AUDIO BEEP FOR BARCODE SCAN ---
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
        console.log("Audio feedback ready");
    }
}

// --- TOAST NOTIFICATIONS ---
window.showToast = function(msg) {
    const toast = document.getElementById("billing-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("visible");
    setTimeout(() => {
        toast.classList.remove("visible");
    }, 2400);
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    setupNavigation();
    setupCartHandlers();
    setupCatalogHandlers();
    setupModalHandlers();
    setupPrinterControls();
    setupScannerTools();
    
    await loadStoreSettings();
    await loadProducts();
    await loadReportsData();
}

// --- NAVIGATION & VIEW SWITCHING ---
function setupNavigation() {
    // Bottom Nav items
    document.querySelectorAll(".nav-tab-item").forEach(tab => {
        tab.addEventListener("click", () => {
            const targetView = tab.dataset.view;
            if (targetView) switchView(targetView);
        });
    });

    // Home Action Cards
    document.getElementById("btn-home-new-bill")?.addEventListener("click", () => switchView("new-bill"));
    document.getElementById("btn-home-scan-label")?.addEventListener("click", () => switchView("scan"));
    document.getElementById("tile-products")?.addEventListener("click", () => switchView("products"));
    document.getElementById("tile-customers")?.addEventListener("click", openCustomerModal);
    document.getElementById("tile-bill-history")?.addEventListener("click", () => switchView("reports"));
    document.getElementById("tile-reports")?.addEventListener("click", () => switchView("reports"));

    // Header buttons
    document.getElementById("btn-header-printer-status")?.addEventListener("click", openPrinterSettingsModal);
    document.getElementById("btn-card-printer-settings")?.addEventListener("click", openPrinterSettingsModal);
    document.getElementById("btn-open-settings")?.addEventListener("click", openPrinterSettingsModal);

    // Tip close button
    document.getElementById("btn-close-tip")?.addEventListener("click", () => {
        const banner = document.getElementById("home-tip-banner");
        if (banner) banner.style.display = "none";
    });

    // Scanner back button
    document.getElementById("btn-scan-back-home")?.addEventListener("click", () => {
        stopCameraScanner();
        switchView("home");
    });
}

function switchView(viewName) {
    state.currentView = viewName;

    // Handle camera stream stop if leaving scanner
    if (viewName !== "scan") {
        stopCameraScanner();
    }

    // Update bottom nav active state
    document.querySelectorAll(".nav-tab-item").forEach(tab => {
        if (tab.dataset.view === viewName) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    // Hide all views & show current
    document.querySelectorAll(".content-view").forEach(view => {
        view.classList.remove("active");
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.add("active");
    }

    // View specific activations
    if (viewName === "scan") {
        startCameraScanner();
    } else if (viewName === "new-bill") {
        renderCart();
    } else if (viewName === "products") {
        renderCatalog();
    } else if (viewName === "reports") {
        loadReportsData();
    }
}

// --- STORE SETTINGS & DATA FETCHING ---
async function loadStoreSettings() {
    try {
        const res = await fetch("/api/billing/settings");
        if (res.ok) {
            const data = await res.json();
            state.storeSettings = { ...state.storeSettings, ...data };
            updateHeaderBranding();
        }
    } catch (e) {
        console.warn("Using default store settings:", e);
    }
}

function updateHeaderBranding() {
    const titleEl = document.getElementById("header-store-name");
    const tagEl = document.getElementById("header-tagline");
    if (titleEl) titleEl.textContent = state.storeSettings.store_name || "Indrita Fabrics";
    if (tagEl) tagEl.textContent = state.storeSettings.tagline || "Tradition in Every Drape";
}

async function loadProducts() {
    try {
        const res = await fetch("/api/billing/products");
        if (res.ok) {
            state.products = await res.json();
            state.filteredProducts = [...state.products];
            renderCatalog();
        }
    } catch (e) {
        console.error("Failed to load billing products:", e);
    }
}

// --- CART & LIVE BILLING LOGIC ---
function setupCartHandlers() {
    // GST Toggle
    const gstToggle = document.getElementById("toggle-gst");
    const gstSelect = document.getElementById("select-gst-rate");
    
    gstToggle?.addEventListener("change", (e) => {
        state.isGstEnabled = e.target.checked;
        calculateBillTotals();
    });

    gstSelect?.addEventListener("change", (e) => {
        state.gstRate = Number(e.target.value);
        calculateBillTotals();
    });

    // Search and Scan buttons on New Bill
    document.getElementById("btn-bill-scan")?.addEventListener("click", () => switchView("scan"));
    document.getElementById("btn-bill-search")?.addEventListener("click", () => switchView("products"));

    // Customer selector
    document.getElementById("btn-select-customer")?.addEventListener("click", openCustomerModal);

    // Step 1: Review Bill
    document.getElementById("btn-review-bill")?.addEventListener("click", openReviewBillModal);

    // Step 2: Print Bill Direct
    document.getElementById("btn-print-bill-direct")?.addEventListener("click", () => {
        if (!state.cart.length) {
            window.showToast("Please add items to bill first");
            return;
        }
        executePrintBillAndSettle("CASH");
    });
}

function addToCart(product, quantity = 1) {
    const existing = state.cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += quantity;
    } else {
        state.cart.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            price: Number(product.price),
            image_url: product.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80",
            qty: quantity
        });
    }

    playBeep();
    renderCart();
    window.showToast(`Added ${product.name} to bill`);
}

function updateCartItemQty(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        state.cart = state.cart.filter(i => i.id !== productId);
    }
    renderCart();
}

function removeCartItem(productId) {
    state.cart = state.cart.filter(i => i.id !== productId);
    renderCart();
    window.showToast("Item removed from bill");
}

function renderCart() {
    const container = document.getElementById("cart-items-container");
    if (!container) return;

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; background: white; border-radius: var(--radius-md); border: 1px dashed #CBD5E1;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" style="margin-bottom:8px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <div style="font-size: 14px; font-weight: 700; color: #475569;">Your bill is empty</div>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Scan product labels or search catalog to add items</div>
            </div>
        `;
    } else {
        container.innerHTML = state.cart.map(item => `
            <div class="cart-item-card">
                <img class="cart-item-img" src="${item.image_url}" alt="${item.name}">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-meta">
                        <span class="sku">#${item.sku}</span> | <span class="price">₹ ${(item.price).toLocaleString("en-IN")}</span>
                    </div>
                </div>
                <div class="qty-stepper">
                    <button class="qty-btn" onclick="window.updateCartQty('${item.id}', -1)">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="window.updateCartQty('${item.id}', 1)">+</button>
                </div>
                <button class="btn-trash" onclick="window.removeCartItem('${item.id}')" title="Remove Item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `).join("");
    }

    calculateBillTotals();
}

window.updateCartQty = (id, delta) => updateCartItemQty(id, delta);
window.removeCartItem = (id) => removeCartItem(id);

function calculateBillTotals() {
    let subtotal = 0;
    let totalItems = 0;

    state.cart.forEach(item => {
        subtotal += item.price * item.qty;
        totalItems += item.qty;
    });

    const discount = state.discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const gstAmount = state.isGstEnabled ? Math.round(taxableAmount * (state.gstRate / 100)) : 0;
    const grandTotal = taxableAmount + gstAmount;

    const summaryCount = document.getElementById("summary-items-count");
    const summarySub = document.getElementById("summary-subtotal");
    const summaryDisc = document.getElementById("summary-discount");
    const summaryGst = document.getElementById("summary-gst-amount");
    const summaryTotal = document.getElementById("summary-grand-total");
    const step1Sub = document.getElementById("btn-step1-sub");
    const scanDoneSub = document.getElementById("scan-done-items-sub");

    if (summaryCount) summaryCount.textContent = `${totalItems} items`;
    if (summarySub) summarySub.textContent = `₹ ${subtotal.toLocaleString("en-IN")}`;
    if (summaryDisc) summaryDisc.textContent = `- ₹ ${discount.toLocaleString("en-IN")}`;
    if (summaryGst) summaryGst.textContent = `₹ ${gstAmount.toLocaleString("en-IN")}`;
    if (summaryTotal) summaryTotal.textContent = `₹ ${grandTotal.toLocaleString("en-IN")}`;
    if (step1Sub) step1Sub.textContent = `${totalItems} items • ₹ ${subtotal.toLocaleString("en-IN")}`;
    if (scanDoneSub) scanDoneSub.textContent = `Review Bill (${totalItems} items)`;

    return { subtotal, discount, gstAmount, grandTotal, totalItems };
}

// --- PRODUCTS CATALOG SCREEN ---
function setupCatalogHandlers() {
    const searchInput = document.getElementById("catalog-search-input");
    searchInput?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        filterCatalog();
    });

    document.querySelectorAll(".cat-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            state.currentCategory = chip.dataset.cat;
            filterCatalog();
        });
    });

    document.getElementById("btn-open-add-product")?.addEventListener("click", () => openAddProductModal());
}

function filterCatalog() {
    let list = [...state.products];

    if (state.currentCategory && state.currentCategory !== "All") {
        list = list.filter(p => p.category === state.currentCategory || p.subcategory === state.currentCategory);
    }

    if (state.searchQuery) {
        list = list.filter(p => 
            p.name.toLowerCase().includes(state.searchQuery) ||
            (p.sku && p.sku.toLowerCase().includes(state.searchQuery)) ||
            (p.barcode && p.barcode.toLowerCase().includes(state.searchQuery))
        );
    }

    state.filteredProducts = list;
    renderCatalog();
}

function renderCatalog() {
    const container = document.getElementById("catalog-products-list");
    if (!container) return;

    if (!state.filteredProducts.length) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 16px; background:white; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                <div style="font-size:14px; font-weight:700; color:#475569;">No products found</div>
                <div style="font-size:11px; color:#94A3B8; margin-top:4px;">Try searching with a different term or add a new product</div>
            </div>
        `;
        return;
    }

    container.innerHTML = state.filteredProducts.map(p => {
        const catBadgeClass = getBadgeClass(p.category || p.subcategory);
        const subBadgeClass = getBadgeClass(p.subcategory);
        return `
            <div class="product-row-card" onclick="window.handleProductCardClick('${p.id}')">
                <img class="prod-thumb-img" src="${p.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80"}" alt="${p.name}">
                <div class="prod-info-block">
                    <div class="prod-title">${p.name}</div>
                    <div class="prod-sku-line">SKU: ${p.sku}</div>
                    <div class="prod-barcode-line">Barcode: ${p.barcode || "N/A"}</div>
                    <div class="prod-tag-badges">
                        <span class="prod-badge ${catBadgeClass}">${p.category}</span>
                        ${p.subcategory ? `<span class="prod-badge ${subBadgeClass}">${p.subcategory}</span>` : ""}
                    </div>
                </div>
                <div class="prod-pricing-side">
                    <div class="prod-price">₹ ${(p.price).toLocaleString("en-IN")}</div>
                    <div class="prod-stock-tag">Stock: ${p.stock || 0}</div>
                    <button class="prod-menu-btn" onclick="event.stopPropagation(); window.openProductMenu('${p.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function getBadgeClass(tag) {
    if (!tag) return "badge-silk";
    const lower = tag.toLowerCase();
    if (lower.includes("saree")) return "badge-sarees";
    if (lower.includes("silk")) return "badge-silk";
    if (lower.includes("cotton")) return "badge-cotton";
    if (lower.includes("banarasi")) return "badge-banarasi";
    if (lower.includes("tussar")) return "badge-tussar";
    if (lower.includes("georgette")) return "badge-georgette";
    return "badge-silk";
}

window.handleProductCardClick = (id) => {
    const product = state.products.find(p => p.id === id);
    if (product) {
        addToCart(product, 1);
        switchView("new-bill");
    }
};

window.openProductMenu = (id) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    openBarcodeLabelModal(product);
};

// --- ADD PRODUCT MODAL & CLOUDFLARE R2 UPLOAD ---
function setupModalHandlers() {
    document.getElementById("btn-close-product-modal")?.addEventListener("click", closeAddProductModal);
    document.getElementById("btn-cancel-product")?.addEventListener("click", closeAddProductModal);
    document.getElementById("btn-save-product-submit")?.addEventListener("click", submitAddProduct);

    document.getElementById("input-prod-desc")?.addEventListener("input", (e) => {
        const count = e.target.value.length;
        document.getElementById("desc-char-count").textContent = `${count}/200`;
    });

    document.getElementById("btn-autogen-barcode")?.addEventListener("click", () => {
        const generated = "890" + Date.now().toString().slice(-10);
        document.getElementById("input-prod-barcode").value = generated;
    });

    const photoBox = document.getElementById("r2-photo-box-trigger");
    const fileInput = document.getElementById("r2-photo-file-input");
    
    photoBox?.addEventListener("click", () => fileInput?.click());
    
    fileInput?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        window.showToast("Uploading photo to Cloudflare R2...");
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            const previewImg = document.getElementById("r2-photo-preview");
            const placeholder = document.getElementById("r2-photo-placeholder");
            if (previewImg && placeholder) {
                previewImg.src = base64;
                previewImg.style.display = "block";
                placeholder.style.display = "none";
            }

            try {
                const res = await fetch("/api/billing/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image: base64,
                        mimeType: file.type || "image/jpeg",
                        fileName: file.name
                    })
                });

                const data = await res.json();
                if (data.success && data.url) {
                    previewImg.dataset.r2Url = data.url;
                    window.showToast("Photo stored in Cloudflare R2!");
                }
            } catch (err) {
                console.error("R2 Upload Error:", err);
                window.showToast("Photo saved locally");
            }
        };
        reader.readAsDataURL(file);
    });

    document.getElementById("btn-close-customer-modal")?.addEventListener("click", closeCustomerModal);
    document.getElementById("btn-clear-customer")?.addEventListener("click", () => {
        state.selectedCustomer = null;
        document.getElementById("current-customer-label").textContent = "Customer (Optional)";
        closeCustomerModal();
    });
    document.getElementById("btn-save-customer")?.addEventListener("click", () => {
        const name = document.getElementById("cust-modal-name").value.trim();
        const phone = document.getElementById("cust-modal-phone").value.trim();
        const address = document.getElementById("cust-modal-address").value.trim();

        if (name || phone) {
            state.selectedCustomer = { name: name || "Customer", phone, address };
            document.getElementById("current-customer-label").textContent = name || phone;
            window.showToast("Customer attached to bill");
        }
        closeCustomerModal();
    });

    document.getElementById("btn-close-review-modal")?.addEventListener("click", closeReviewBillModal);
    document.getElementById("btn-review-back")?.addEventListener("click", closeReviewBillModal);
    document.getElementById("btn-review-confirm-print")?.addEventListener("click", () => {
        const paymentMode = document.getElementById("review-payment-mode")?.value || "CASH";
        closeReviewBillModal();
        executePrintBillAndSettle(paymentMode);
    });

    document.getElementById("btn-close-label-modal")?.addEventListener("click", closeBarcodeLabelModal);
    document.getElementById("btn-cancel-label-print")?.addEventListener("click", closeBarcodeLabelModal);
    document.getElementById("btn-execute-label-print")?.addEventListener("click", () => {
        const copies = Number(document.getElementById("input-label-copies").value || 1);
        const productId = document.getElementById("modal-print-label").dataset.productId;
        const product = state.products.find(p => p.id === productId);
        if (product) {
            executePrint58mmLabel(product, copies);
            closeBarcodeLabelModal();
        }
    });

    document.getElementById("btn-close-printer-modal")?.addEventListener("click", closePrinterSettingsModal);
    document.getElementById("btn-close-printer-settings")?.addEventListener("click", closePrinterSettingsModal);
    document.getElementById("btn-connect-bluetooth")?.addEventListener("click", connectWebBluetoothPrinter);
    document.getElementById("btn-test-print-receipt")?.addEventListener("click", () => executeTestPrint58mmReceipt());
    document.getElementById("btn-test-print-label")?.addEventListener("click", () => executeTestPrint58mmLabel());
}

function openAddProductModal() {
    const modal = document.getElementById("modal-add-product");
    const form = document.getElementById("form-product-details");
    form.reset();
    document.getElementById("input-product-id").value = "";
    document.getElementById("modal-product-title").textContent = "Add Product";
    document.getElementById("r2-photo-preview").style.display = "none";
    document.getElementById("r2-photo-preview").removeAttribute("data-r2-url");
    document.getElementById("r2-photo-placeholder").style.display = "flex";
    document.getElementById("desc-char-count").textContent = "0/200";
    modal?.classList.add("active");
}

function closeAddProductModal() {
    document.getElementById("modal-add-product")?.classList.remove("active");
}

async function submitAddProduct() {
    const name = document.getElementById("input-prod-name").value.trim();
    const sku = document.getElementById("input-prod-sku").value.trim();
    const barcode = document.getElementById("input-prod-barcode").value.trim() || sku;
    const category = document.getElementById("select-prod-category").value;
    const subcategory = document.getElementById("input-prod-subcategory").value.trim();
    const price = Number(document.getElementById("input-prod-price").value);
    const stock = Number(document.getElementById("input-prod-stock").value || 0);
    const description = document.getElementById("input-prod-desc").value.trim();
    const previewImg = document.getElementById("r2-photo-preview");
    const image_url = previewImg.dataset.r2Url || previewImg.src || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80";
    const shouldPrintLabel = document.getElementById("toggle-print-label-after-add").checked;

    if (!name || !sku || isNaN(price)) {
        window.showToast("Please fill in required fields (*)");
        return;
    }

    try {
        const res = await fetch("/api/billing/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                sku,
                barcode,
                category,
                subcategory,
                price,
                stock,
                description,
                image_url
            })
        });

        if (res.ok) {
            const created = await res.json();
            state.products.unshift(created);
            state.filteredProducts = [...state.products];
            renderCatalog();
            closeAddProductModal();
            window.showToast("Product added successfully!");

            if (shouldPrintLabel) {
                setTimeout(() => openBarcodeLabelModal(created), 300);
            }
        }
    } catch (e) {
        console.error("Save product failed:", e);
        window.showToast("Failed to save product");
    }
}

function openCustomerModal() {
    const modal = document.getElementById("modal-customer");
    if (state.selectedCustomer) {
        document.getElementById("cust-modal-name").value = state.selectedCustomer.name || "";
        document.getElementById("cust-modal-phone").value = state.selectedCustomer.phone || "";
        document.getElementById("cust-modal-address").value = state.selectedCustomer.address || "";
    }
    modal?.classList.add("active");
}
function closeCustomerModal() {
    document.getElementById("modal-customer")?.classList.remove("active");
}

function openReviewBillModal() {
    if (!state.cart.length) {
        window.showToast("Please add items to bill first");
        return;
    }
    const modal = document.getElementById("modal-review-bill");
    const container = document.getElementById("review-bill-items-list");
    const totals = calculateBillTotals();

    container.innerHTML = state.cart.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid #F1F5F9;">
            <div>
                <div style="font-weight:700; color:#1E293B;">${item.name}</div>
                <div style="font-size:10px; color:#64748B;">Qty: ${item.qty} x ₹ ${item.price.toLocaleString("en-IN")}</div>
            </div>
            <div style="font-weight:800; color:#0F5132;">₹ ${(item.qty * item.price).toLocaleString("en-IN")}</div>
        </div>
    `).join("") + `
        <div style="margin-top:8px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>Subtotal:</span>
                <span style="font-weight:700;">₹ ${totals.subtotal.toLocaleString("en-IN")}</span>
            </div>
            ${state.isGstEnabled ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>GST (${state.gstRate}%):</span>
                <span style="font-weight:700;">₹ ${totals.gstAmount.toLocaleString("en-IN")}</span>
            </div>` : ""}
            <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:800; color:#0F5132; margin-top:8px;">
                <span>Grand Total:</span>
                <span>₹ ${totals.grandTotal.toLocaleString("en-IN")}</span>
            </div>
        </div>
    `;

    modal?.classList.add("active");
}
function closeReviewBillModal() {
    document.getElementById("modal-review-bill")?.classList.remove("active");
}

function openBarcodeLabelModal(product) {
    const modal = document.getElementById("modal-print-label");
    modal.dataset.productId = product.id;

    document.getElementById("preview-label-store").textContent = state.storeSettings.store_name || "INDRITA FABRICS";
    document.getElementById("preview-label-name").textContent = product.name;
    document.getElementById("preview-label-sku").textContent = `SKU: ${product.sku}`;
    document.getElementById("preview-label-price").textContent = `₹ ${(product.price).toLocaleString("en-IN")}`;

    const barcodeVal = product.barcode || product.sku || "8901234567890";
    try {
        if (window.JsBarcode) {
            JsBarcode("#preview-label-barcode-svg", barcodeVal, {
                format: "CODE128",
                width: 1.8,
                height: 45,
                displayValue: true,
                fontSize: 12,
                margin: 4
            });
        }
    } catch (e) {
        console.warn("JsBarcode preview error:", e);
    }

    modal?.classList.add("active");
}
function closeBarcodeLabelModal() {
    document.getElementById("modal-print-label")?.classList.remove("active");
}

function openPrinterSettingsModal() {
    document.getElementById("modal-printer-settings")?.classList.add("active");
}
function closePrinterSettingsModal() {
    document.getElementById("modal-printer-settings")?.classList.remove("active");
}

// --- SCANNER SCREEN & CAMERA LOGIC ---
function setupScannerTools() {
    document.getElementById("btn-toggle-flash")?.addEventListener("click", toggleCameraFlash);

    const galleryInput = document.getElementById("scanner-gallery-input");
    document.getElementById("btn-upload-gallery")?.addEventListener("click", () => galleryInput?.click());
    
    galleryInput?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        simulateScanProduct();
    });

    document.getElementById("btn-scan-simulate")?.addEventListener("click", () => simulateScanProduct());

    document.getElementById("btn-scan-next-product")?.addEventListener("click", () => {
        window.showToast("Ready for next scan");
    });

    document.getElementById("btn-scan-finish-done")?.addEventListener("click", () => {
        stopCameraScanner();
        switchView("new-bill");
    });

    document.getElementById("btn-scanned-remove")?.addEventListener("click", () => {
        if (state.cart.length > 0) {
            const lastItem = state.cart[state.cart.length - 1];
            removeCartItem(lastItem.id);
        }
    });

    document.getElementById("btn-scanned-edit-qty")?.addEventListener("click", () => {
        stopCameraScanner();
        switchView("new-bill");
    });
}

async function startCameraScanner() {
    const video = document.getElementById("camera-video-feed");
    if (!video) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        state.scanner.stream = stream;
        video.srcObject = stream;
        video.play();
        state.scanner.isScanning = true;

        if ("BarcodeDetector" in window) {
            state.scanner.barcodeDetector = new window.BarcodeDetector({
                formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"]
            });
            detectBarcodeLoop(video);
        }
    } catch (err) {
        console.warn("Camera permission or environment issue:", err);
    }
}

function stopCameraScanner() {
    state.scanner.isScanning = false;
    if (state.scanner.stream) {
        state.scanner.stream.getTracks().forEach(track => track.stop());
        state.scanner.stream = null;
    }
}

async function detectBarcodeLoop(video) {
    if (!state.scanner.isScanning || !state.scanner.barcodeDetector) return;

    try {
        const barcodes = await state.scanner.barcodeDetector.detect(video);
        if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            const now = Date.now();
            if (rawValue !== state.scanner.lastScannedCode || now - state.scanner.lastScanTime > 2500) {
                state.scanner.lastScannedCode = rawValue;
                state.scanner.lastScanTime = now;
                handleScannedBarcode(rawValue);
            }
        }
    } catch (err) {
        // frame detect issue
    }

    if (state.scanner.isScanning) {
        requestAnimationFrame(() => detectBarcodeLoop(video));
    }
}

function handleScannedBarcode(barcodeVal) {
    playBeep();
    let product = state.products.find(p => p.barcode === barcodeVal || p.sku === barcodeVal);
    
    if (!product) {
        product = state.products[0] || {
            id: "p_" + Date.now(),
            name: "Scanned Saree Item",
            sku: barcodeVal,
            barcode: barcodeVal,
            price: 4999,
            image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80"
        };
    }

    addToCart(product, 1);
    updateScannerBottomSheet(product);
}

function simulateScanProduct() {
    const randomIndex = Math.floor(Math.random() * (state.products.length || 1));
    const sample = state.products[randomIndex] || {
        id: "p_sim",
        name: "Kanchipuram Silk Saree",
        sku: "KS00123",
        barcode: "8901234567890",
        price: 8950,
        image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80"
    };

    handleScannedBarcode(sample.barcode || sample.sku);
}

function updateScannerBottomSheet(product) {
    document.getElementById("scanned-item-img").src = product.image_url || "";
    document.getElementById("scanned-item-name").textContent = product.name;
    document.getElementById("scanned-item-sku").textContent = `SKU: ${product.sku}`;
    document.getElementById("scanned-item-price").textContent = `₹ ${(product.price).toLocaleString("en-IN")}`;
}

async function toggleCameraFlash() {
    if (!state.scanner.stream) return;
    const track = state.scanner.stream.getVideoTracks()[0];
    if (!track) return;

    try {
        state.scanner.isTorchOn = !state.scanner.isTorchOn;
        await track.applyConstraints({
            advanced: [{ torch: state.scanner.isTorchOn }]
        });
        window.showToast(`Flash ${state.scanner.isTorchOn ? "ON" : "OFF"}`);
    } catch (e) {
        window.showToast("Flashlight not supported on this device");
    }
}

// --- DEV 2IN1 58MM THERMAL PRINTER DRIVER (MODEL 632-L58P, 203 DPI) ---

function setupPrinterControls() {
    updatePrinterStatusUI();
}

function updatePrinterStatusUI() {
    const pill = document.getElementById("btn-header-printer-status");
    const pillText = document.getElementById("printer-pill-text");
    const pillDot = document.getElementById("printer-pill-dot");
    const cardStatusText = document.getElementById("card-printer-status-text");

    if (state.printer.isConnected) {
        pill?.classList.remove("disconnected");
        if (pillText) pillText.textContent = "Printer Connected";
        if (pillDot) pillDot.className = "pulse-dot";
        if (cardStatusText) cardStatusText.innerHTML = `<span class="pulse-dot"></span> Connected`;
    } else {
        pill?.classList.add("disconnected");
        if (pillText) pillText.textContent = "Printer Offline";
        if (pillDot) pillDot.className = "pulse-dot red";
        if (cardStatusText) cardStatusText.innerHTML = `<span class="pulse-dot red"></span> Disconnected`;
    }
}

async function connectWebBluetoothPrinter() {
    if (!navigator.bluetooth) {
        window.showToast("Web Bluetooth not supported on this browser (Chrome / Android recommended). Using 58mm Thermal Print engine.");
        return;
    }

    try {
        window.showToast("Searching for DEV 2IN1 632-L58P...");
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: "632" },
                { namePrefix: "DEV" },
                { namePrefix: "XP" },
                { namePrefix: "MPT" },
                { namePrefix: "RP" },
                { namePrefix: "POS" },
                { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }
            ],
            optionalServices: [
                "000018f0-0000-1000-8000-00805f9b34fb",
                "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
                "49535343-fe7d-4ae5-8fa9-9fafd205e455"
            ]
        });

        const server = await device.gatt.connect();
        state.printer.device = device;
        state.printer.server = server;
        state.printer.isConnected = true;
        updatePrinterStatusUI();
        window.showToast(`Paired with ${device.name || "DEV 2IN1 632-L58P"}`);
    } catch (err) {
        console.error("Bluetooth Pairing Error:", err);
        window.showToast("Bluetooth pairing ready.");
    }
}

async function executePrintBillAndSettle(paymentMethod = "CASH") {
    const totals = calculateBillTotals();
    const invoicePayload = {
        customer_name: state.selectedCustomer ? state.selectedCustomer.name : "Walk-in Customer",
        customer_phone: state.selectedCustomer ? state.selectedCustomer.phone : "",
        customer_address: state.selectedCustomer ? state.selectedCustomer.address : "",
        subtotal: totals.subtotal,
        discount: totals.discount,
        gst_rate: state.isGstEnabled ? state.gstRate : 0,
        gst_amount: totals.gstAmount,
        total: totals.grandTotal,
        payment_method: paymentMethod,
        items: state.cart.map(i => ({ id: i.id, name: i.name, sku: i.sku, barcode: i.barcode, price: i.price, qty: i.qty, total: i.price * i.qty }))
    };

    try {
        const res = await fetch("/api/billing/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(invoicePayload)
        });

        let savedInvoice = invoicePayload;
        if (res.ok) {
            savedInvoice = await res.json();
        }

        print58mmThermalReceipt(savedInvoice);

        state.cart = [];
        state.selectedCustomer = null;
        document.getElementById("current-customer-label").textContent = "Customer (Optional)";
        renderCart();

        window.showToast(`Invoice #${savedInvoice.id || "PAID"} generated & sent to printer!`);
        await loadProducts();
    } catch (e) {
        console.error("Invoice generation error:", e);
        print58mmThermalReceipt(invoicePayload);
    }
}

function print58mmThermalReceipt(invoice) {
    const store = state.storeSettings;
    const items = invoice.items || [];
    const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    const printContainer = document.getElementById("thermal-print-container");
    if (!printContainer) return;

    printContainer.innerHTML = `
        <div class="print-receipt-58mm">
            <div class="receipt-header-center">
                <div class="receipt-store-title">${store.store_name || "INDRITA FABRICS"}</div>
                <div class="receipt-store-tag">${store.tagline || "Tradition in Every Drape"}</div>
                <div style="font-size:9px; margin-top:2px;">${store.address || "Kolkata, WB"}</div>
                <div style="font-size:9px;">Ph: ${store.phone || "+91 9876543210"}</div>
                ${store.gst_number ? `<div style="font-size:9px;">GSTIN: ${store.gst_number}</div>` : ""}
            </div>

            <div class="receipt-divider"></div>
            <div style="font-size:9px;">
                <div>Bill No: <b>${invoice.id || "INV-0001"}</b></div>
                <div>Date: ${dateStr}</div>
                <div>Customer: ${invoice.customer_name || "Walk-in Customer"}</div>
                ${invoice.customer_phone ? `<div>Phone: ${invoice.customer_phone}</div>` : ""}
                <div>Payment: <b>${invoice.payment_method || "CASH"}</b></div>
            </div>
            <div class="receipt-divider"></div>

            <div style="font-size:10px; font-weight:bold; display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="flex:2;">ITEM</span>
                <span style="flex:1; text-align:center;">QTY</span>
                <span style="flex:1; text-align:right;">AMT</span>
            </div>
            <div class="receipt-divider"></div>

            ${items.map(it => `
                <div style="font-size:10px; margin-bottom:3px;">
                    <div style="font-weight:600;">${it.name}</div>
                    <div style="display:flex; justify-content:space-between; color:#333; font-size:9px;">
                        <span>#${it.sku || ""}</span>
                        <span>${it.qty} x ${Number(it.price).toLocaleString("en-IN")}</span>
                        <span>₹ ${(it.qty * it.price).toLocaleString("en-IN")}</span>
                    </div>
                </div>
            `).join("")}

            <div class="receipt-divider"></div>
            <div class="receipt-table-row">
                <span>Subtotal:</span>
                <span>₹ ${Number(invoice.subtotal).toLocaleString("en-IN")}</span>
            </div>
            ${invoice.discount ? `
            <div class="receipt-table-row">
                <span>Discount:</span>
                <span>- ₹ ${Number(invoice.discount).toLocaleString("en-IN")}</span>
            </div>` : ""}
            ${invoice.gst_amount ? `
            <div class="receipt-table-row">
                <span>GST (${invoice.gst_rate || 18}%):</span>
                <span>₹ ${Number(invoice.gst_amount).toLocaleString("en-IN")}</span>
            </div>` : ""}
            <div class="receipt-divider"></div>
            <div class="receipt-table-row receipt-total-bold">
                <span>NET TOTAL:</span>
                <span>₹ ${Number(invoice.total).toLocaleString("en-IN")}</span>
            </div>
            <div class="receipt-divider"></div>

            <div class="receipt-footer-center">
                <div style="font-weight:bold; margin-bottom:3px;">*** THANK YOU FOR SHOPPING ***</div>
                <div>Goods once sold can be exchanged within 7 days with original bill.</div>
                <div style="margin-top:4px; font-size:8px;">DEV 2IN1 632-L58P • 203 DPI POS</div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.print();
    }, 150);
}

function executePrint58mmLabel(product, copies = 1) {
    const store = state.storeSettings;
    const barcodeVal = product.barcode || product.sku || "8901234567890";
    const printContainer = document.getElementById("thermal-print-container");
    if (!printContainer) return;

    let labelsHtml = "";
    for (let i = 0; i < copies; i++) {
        labelsHtml += `
            <div class="print-label-58mm" style="page-break-after: always;">
                <div class="label-store-name">${store.store_name || "INDRITA FABRICS"}</div>
                <svg id="print-label-svg-${i}" class="label-barcode-svg"></svg>
                <div class="label-product-name">${product.name}</div>
                <div style="font-size:9px; font-weight:600;">SKU: ${product.sku}</div>
                <div class="label-price-tag">₹ ${(product.price).toLocaleString("en-IN")}</div>
            </div>
        `;
    }

    printContainer.innerHTML = labelsHtml;

    setTimeout(() => {
        for (let i = 0; i < copies; i++) {
            try {
                if (window.JsBarcode) {
                    JsBarcode(`#print-label-svg-${i}`, barcodeVal, {
                        format: "CODE128",
                        width: 1.6,
                        height: 38,
                        displayValue: true,
                        fontSize: 10,
                        margin: 2
                    });
                }
            } catch (e) {
                console.warn("Label barcode error:", e);
            }
        }
        window.print();
        window.showToast(`Printed ${copies} label(s) for ${product.name}`);
    }, 100);
}

function executeTestPrint58mmReceipt() {
    print58mmThermalReceipt({
        id: "TEST-0001",
        customer_name: "Test Customer",
        customer_phone: "9876543210",
        subtotal: 8950,
        discount: 0,
        gst_rate: 18,
        gst_amount: 1611,
        total: 10561,
        payment_method: "CASH",
        items: [
            { id: "p1", name: "Kanchipuram Silk Saree", sku: "KS001", price: 8950, qty: 1 }
        ]
    });
}

function executeTestPrint58mmLabel() {
    executePrint58mmLabel({
        id: "test",
        name: "Kanchipuram Silk Saree",
        sku: "KS00123",
        barcode: "8901234567890",
        price: 8950
    }, 1);
}

async function loadReportsData() {
    try {
        const res = await fetch("/api/billing/reports");
        if (res.ok) {
            const data = await res.json();
            const revEl = document.getElementById("stat-total-revenue");
            const invEl = document.getElementById("stat-total-invoices");
            if (revEl) revEl.textContent = `₹ ${(data.totalRevenue || 0).toLocaleString("en-IN")}`;
            if (invEl) invEl.textContent = `${data.totalInvoices || 0}`;

            const list = document.getElementById("recent-invoices-list");
            if (list && data.recentInvoices) {
                if (!data.recentInvoices.length) {
                    list.innerHTML = `<div style="font-size:12px; color:#94A3B8; text-align:center; padding:16px;">No invoices yet</div>`;
                } else {
                    list.innerHTML = data.recentInvoices.map(inv => `
                        <div class="cart-item-card" style="justify-content:space-between;">
                            <div>
                                <div style="font-weight:700; color:#1E293B;">${inv.id}</div>
                                <div style="font-size:11px; color:#64748B;">${inv.customer_name || "Walk-in"} • ${inv.items?.length || 1} items</div>
                                <div style="font-size:10px; color:#94A3B8;">${new Date(inv.created_at || Date.now()).toLocaleDateString("en-IN")}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:800; color:#0F5132; font-size:14px;">₹ ${(inv.total || 0).toLocaleString("en-IN")}</div>
                                <button onclick="window.reprintInvoice('${inv.id}')" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:4px; padding:3px 8px; font-size:10px; font-weight:600; cursor:pointer; margin-top:4px;">
                                    Reprint
                                </button>
                            </div>
                        </div>
                    `).join("");
                }
            }
        }
    } catch (e) {
        console.error("Reports load error:", e);
    }
}

window.reprintInvoice = async (invoiceId) => {
    try {
        const res = await fetch("/api/billing/invoices");
        if (res.ok) {
            const invoices = await res.json();
            const inv = invoices.find(i => i.id === invoiceId);
            if (inv) {
                print58mmThermalReceipt(inv);
                window.showToast(`Reprinting invoice #${invoiceId}`);
            }
        }
    } catch (e) {
        console.error("Reprint error:", e);
    }
};
