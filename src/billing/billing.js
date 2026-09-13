// INDRITA FABRICS - BILLING POS & DEV 2IN1 THERMAL PRINTER SYSTEM
// Model: 632-L58P (203 DPI, 58mm Width) - Direct Bluetooth & Thermal Hardware Engine
import QRCode from "qrcode";

// --- STATE ---
const state = {
    currentView: "home",
    products: [],
    filteredProducts: [],
    selectedProductIds: new Set(),
    categories: [],
    customers: [],
    filteredCustomers: [],
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
        isConnected: false,
        device: null,
        server: null,
        characteristic: null,
        deviceName: "DEV 2IN1 632-L58P",
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

// --- AUDIO BEEP & HAPTICS FOR BARCODE SCAN ---
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08); // A6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
        
        if (navigator.vibrate) {
            navigator.vibrate([30, 40, 60]);
        }
    } catch (e) {
        console.log("Audio/Haptic feedback active");
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
    }, 2800);
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    setupNavigation();
    setupCartHandlers();
    setupCatalogHandlers();
    setupCategoryModalHandlers();
    setupModalHandlers();
    setupPrinterControls();
    setupScannerTools();
    setupMoreSettingsHandlers();
    
    await loadStoreSettings();
    await loadCategories();
    await loadProducts();
    await loadReportsData();
    await loadCustomers();
}

// --- NAVIGATION & VIEW SWITCHING ---
function setupNavigation() {
    document.querySelectorAll(".nav-tab-item").forEach(tab => {
        tab.addEventListener("click", () => {
            const targetView = tab.dataset.view;
            if (targetView) switchView(targetView);
        });
    });

    // Home Screen Actions
    document.getElementById("btn-hero-new-bill")?.addEventListener("click", () => switchView("new-bill"));
    document.getElementById("btn-home-generate-label")?.addEventListener("click", () => openBarcodeLabelModal());
    document.getElementById("btn-home-scan-label")?.addEventListener("click", () => switchView("scan"));
    
    // Legacy / tile buttons (if any)
    document.getElementById("btn-home-new-bill")?.addEventListener("click", () => switchView("new-bill"));
    document.getElementById("tile-products")?.addEventListener("click", () => switchView("products"));
    document.getElementById("tile-customers")?.addEventListener("click", () => switchView("customers"));
    document.getElementById("tile-bill-history")?.addEventListener("click", () => switchView("reports"));
    document.getElementById("tile-reports")?.addEventListener("click", () => switchView("reports"));

    // Printer Actions
    document.getElementById("btn-header-printer-status")?.addEventListener("click", handlePrinterButtonClick);
    document.getElementById("btn-card-connect-printer")?.addEventListener("click", handlePrinterButtonClick);
    document.getElementById("card-bluetooth-printer")?.addEventListener("click", (e) => {
        if (!e.target.closest("button")) handlePrinterButtonClick();
    });
    document.getElementById("btn-card-printer-settings")?.addEventListener("click", openPrinterSettingsModal);
    document.getElementById("btn-open-settings")?.addEventListener("click", () => switchView("more"));

    // Customer View Actions
    document.getElementById("btn-open-add-customer-view")?.addEventListener("click", openCustomerModal);
    document.getElementById("customers-search-input")?.addEventListener("input", (e) => filterCustomers(e.target.value));

    // Bulk Product Actions (Multi-select)
    document.getElementById("btn-bulk-deselect-all")?.addEventListener("click", clearProductSelection);
    document.getElementById("btn-bulk-print-labels")?.addEventListener("click", handleBulkPrintLabels);
    document.getElementById("btn-bulk-delete-products")?.addEventListener("click", handleBulkDeleteProducts);

    // Global listener to close 3-dots popup menus
    document.addEventListener("click", () => closeAllProductMenus());

    document.getElementById("btn-close-tip")?.addEventListener("click", () => {
        const banner = document.getElementById("home-tip-banner");
        if (banner) banner.style.display = "none";
    });

    document.getElementById("btn-scan-back-home")?.addEventListener("click", () => {
        stopCameraScanner();
        switchView("home");
    });
}

function switchView(viewName) {
    state.currentView = viewName;

    if (viewName !== "scan") {
        stopCameraScanner();
    }

    document.querySelectorAll(".nav-tab-item").forEach(tab => {
        if (tab.dataset.view === viewName) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    document.querySelectorAll(".content-view").forEach(view => {
        view.classList.remove("active");
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.add("active");
    }

    if (viewName === "scan") {
        startCameraScanner();
    } else if (viewName === "new-bill") {
        renderCart();
    } else if (viewName === "products") {
        renderCatalog();
    } else if (viewName === "customers") {
        renderCustomersView();
    } else if (viewName === "reports") {
        loadReportsData();
    } else if (viewName === "more") {
        syncMoreTabInputs();
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
            syncMoreTabInputs();
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

function updateReceiptLivePreview() {
    const s = state.storeSettings || {};
    const nameInput = document.getElementById("setting-store-name");
    const tagInput = document.getElementById("setting-store-tagline");
    const phoneInput = document.getElementById("setting-store-phone");
    const gstInput = document.getElementById("setting-store-gst");
    const addrInput = document.getElementById("setting-store-address");
    const footerInput = document.getElementById("setting-receipt-footer");

    const sName = (nameInput ? nameInput.value.trim() : "") || s.store_name || "Indrita Fabrics";
    const sTag = (tagInput ? tagInput.value.trim() : "") || s.tagline || "Tradition in Every Drape";
    const sPhone = (phoneInput ? phoneInput.value.trim() : "") || s.phone || "+91 9876543210";
    const sGst = (gstInput ? gstInput.value.trim().toUpperCase() : "") || s.gst_number || "19AAAAA0000A1Z5";
    const sAddr = (addrInput ? addrInput.value.trim() : "") || s.address || "Main Road, Fabric Market, Kolkata - 700001";
    const sFooter = (footerInput ? footerInput.value.trim() : "") || "Thank you for shopping with us! • Goods once sold can be exchanged within 7 days.";

    const pStore = document.getElementById("preview-receipt-store");
    const pTag = document.getElementById("preview-receipt-tagline");
    const pAddr = document.getElementById("preview-receipt-address");
    const pPhone = document.getElementById("preview-receipt-phone");
    const pGst = document.getElementById("preview-receipt-gst");
    const pFooter = document.getElementById("preview-receipt-footer");

    if (pStore) pStore.textContent = sName;
    if (pTag) pTag.textContent = sTag;
    if (pAddr) pAddr.textContent = sAddr;
    if (pPhone) pPhone.textContent = sPhone ? `Ph: ${sPhone}` : "";
    if (pGst) pGst.textContent = sGst ? `GSTIN: ${sGst}` : "";
    if (pFooter) pFooter.textContent = sFooter;
}

function syncMoreTabInputs() {
    const s = state.storeSettings;
    const nameInput = document.getElementById("setting-store-name");
    const tagInput = document.getElementById("setting-store-tagline");
    const phoneInput = document.getElementById("setting-store-phone");
    const gstInput = document.getElementById("setting-store-gst");
    const addrInput = document.getElementById("setting-store-address");
    const gstRateSelect = document.getElementById("setting-default-gst");

    if (nameInput) nameInput.value = s.store_name || "Indrita Fabrics";
    if (tagInput) tagInput.value = s.tagline || "Tradition in Every Drape";
    if (phoneInput) phoneInput.value = s.phone || "";
    if (gstInput) gstInput.value = s.gst_number || "";
    if (addrInput) addrInput.value = s.address || "";
    if (gstRateSelect && s.default_gst_rate !== undefined) gstRateSelect.value = String(s.default_gst_rate);

    updateReceiptLivePreview();
}

async function loadCategories() {
    try {
        const res = await fetch("/api/billing/categories");
        if (res.ok) {
            const data = await res.json();
            state.categories = (data || []).map(c => typeof c === "string" ? c : c.name).filter(Boolean);
        }
    } catch (e) {
        console.warn("Failed to load categories from API:", e);
    }

    if (!state.categories || state.categories.length === 0) {
        state.categories = [
            "Sarees",
            "Cotton Saree",
            "Silk Saree",
            "Handloom Saree",
            "Fabrics",
            "Suits",
            "Dupattas",
            "Kurtis"
        ];
    }

    // Merge any categories from products
    if (state.products && state.products.length > 0) {
        state.products.forEach(p => {
            if (p.category && !state.categories.some(c => c.toLowerCase() === p.category.toLowerCase())) {
                state.categories.push(p.category);
            }
        });
    }

    renderCategoryChips();
    populateCategoryDropdown();
    renderModalCategoriesList();
}

async function loadProducts() {
    try {
        const res = await fetch("/api/billing/products");
        if (res.ok) {
            state.products = await res.json();
            await loadCategories();
            filterCatalog();
        }
    } catch (e) {
        console.error("Failed to load billing products:", e);
    }
}

// --- CART & LIVE BILLING LOGIC ---
function setupCartHandlers() {
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

    document.getElementById("btn-bill-scan")?.addEventListener("click", () => switchView("scan"));
    document.getElementById("btn-bill-search")?.addEventListener("click", () => switchView("products"));
    document.getElementById("btn-select-customer")?.addEventListener("click", openCustomerModal);
    document.getElementById("btn-review-bill")?.addEventListener("click", openReviewBillModal);

    // Direct Print Button
    document.getElementById("btn-print-bill-direct")?.addEventListener("click", async () => {
        if (!state.cart.length) {
            window.showToast("Your bill is empty! Add products first.");
            return;
        }
        await executeDirectPrintAndSettle("CASH");
    });
}

function addToCart(product, qty = 1) {
    const existing = state.cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += qty;
    } else {
        state.cart.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: Number(product.price),
            qty: qty,
            barcode: product.barcode,
            category: product.category,
            image_url: product.image_url
        });
    }
    state.lastScannedProduct = product;
    calculateBillTotals();
    renderCart();
    updateScannerCartSummary();
    playBeep();
    window.showToast(`Added ${product.name} to bill`);
}

function updateCartItemQty(productId, newQty) {
    if (newQty <= 0) {
        state.cart = state.cart.filter(item => item.id !== productId);
    } else {
        const item = state.cart.find(item => item.id === productId);
        if (item) item.qty = newQty;
    }
    calculateBillTotals();
    renderCart();
    updateScannerCartSummary();
}

function removeCartItem(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    calculateBillTotals();
    renderCart();
    updateScannerCartSummary();
    window.showToast("Item removed from bill");
}

function calculateBillTotals() {
    let subtotal = 0;
    let totalItems = 0;

    state.cart.forEach(item => {
        subtotal += (item.price * item.qty);
        totalItems += item.qty;
    });

    state.subtotal = subtotal;

    if (state.isGstEnabled) {
        state.gstAmount = Math.round((subtotal * (state.gstRate / 100)));
    } else {
        state.gstAmount = 0;
    }

    state.grandTotal = Math.max(0, subtotal - state.discountAmount + state.gstAmount);

    const summaryCount = document.getElementById("summary-items-count");
    const summarySub = document.getElementById("summary-subtotal");
    const summaryDisc = document.getElementById("summary-discount");
    const summaryGst = document.getElementById("summary-gst-amount");
    const summaryTotal = document.getElementById("summary-grand-total");
    const step1Sub = document.getElementById("btn-step1-sub");
    const scanDoneSub = document.getElementById("scan-done-items-sub");
    const homeSub = document.getElementById("home-cart-summary-sub");

    if (summaryCount) summaryCount.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;
    if (summarySub) summarySub.textContent = `₹ ${subtotal.toLocaleString("en-IN")}`;
    if (summaryDisc) summaryDisc.textContent = `- ₹ ${(state.discountAmount || 0).toLocaleString("en-IN")}`;
    if (summaryGst) summaryGst.textContent = `₹ ${state.gstAmount.toLocaleString("en-IN")}`;
    if (summaryTotal) summaryTotal.textContent = `₹ ${state.grandTotal.toLocaleString("en-IN")}`;
    if (step1Sub) step1Sub.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'} • ₹ ${state.grandTotal.toLocaleString("en-IN")}`;
    if (scanDoneSub) scanDoneSub.textContent = `Review Bill (${totalItems} items)`;
    if (homeSub) {
        homeSub.textContent = `${totalItems} items added • ₹ ${state.grandTotal.toLocaleString("en-IN")}`;
    }

    updateScannerCartSummary();

    return { subtotal, discount: state.discountAmount || 0, gstAmount: state.gstAmount, grandTotal: state.grandTotal, totalItems };
}

function renderCart() {
    const container = document.getElementById("cart-items-container");
    if (!container) return;

    if (!state.cart.length) {
        container.innerHTML = `
            <div class="cart-empty-state" style="text-align: center; padding: 32px 16px; background: white; border-radius: var(--radius-md); border: 1px dashed #CBD5E1;">
                <div class="empty-icon-circle" style="margin-bottom:8px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </div>
                <div class="empty-title" style="font-size: 14px; font-weight: 700; color: #475569;">Cart is empty</div>
                <div class="empty-desc" style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Scan product barcode or tap search above to add sarees to bill</div>
            </div>
        `;
        return;
    }

    container.innerHTML = state.cart.map(item => `
        <div class="cart-item-card">
            <img class="cart-item-img" src="${item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80'}" alt="${item.name}">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-meta">
                    <span>SKU: ${item.sku}</span>
                    <span>•</span>
                    <span>₹ ${(item.price).toLocaleString("en-IN")} each</span>
                </div>
                <div class="cart-item-line-total">₹ ${(item.price * item.qty).toLocaleString("en-IN")}</div>
            </div>
            
            <div class="cart-qty-ctrl qty-stepper">
                <button type="button" class="btn-qty qty-btn" onclick="window.handleQtyMinus('${item.id}')">&minus;</button>
                <span class="qty-val">${item.qty}</span>
                <button type="button" class="btn-qty qty-btn" onclick="window.handleQtyPlus('${item.id}')">&plus;</button>
            </div>
            <button class="btn-trash" onclick="window.removeCartItem('${item.id}')" title="Remove Item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>
    `).join("");

    calculateBillTotals();
}

window.handleQtyMinus = (id) => {
    const item = state.cart.find(i => i.id === id);
    if (item) updateCartItemQty(id, item.qty - 1);
};

window.handleQtyPlus = (id) => {
    const item = state.cart.find(i => i.id === id);
    if (item) updateCartItemQty(id, item.qty + 1);
};

window.updateCartQty = (id, delta) => updateCartItemQty(id, delta);
window.removeCartItem = (id) => removeCartItem(id);

// --- PRODUCTS CATALOG SCREEN ---
function setupCatalogHandlers() {
    const searchInput = document.getElementById("catalog-search-input");
    const clearBtn = document.getElementById("btn-clear-catalog-search");

    searchInput?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        if (clearBtn) clearBtn.style.display = state.searchQuery ? "flex" : "none";
        filterCatalog();
    });

    clearBtn?.addEventListener("click", () => {
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
        state.searchQuery = "";
        clearBtn.style.display = "none";
        filterCatalog();
    });

    document.getElementById("btn-open-add-product")?.addEventListener("click", () => openAddProductModal());
}

function renderCategoryChips() {
    const container = document.getElementById("catalog-category-chips");
    if (!container) return;

    const categories = state.categories && state.categories.length > 0
        ? state.categories
        : Array.from(new Set(state.products.map(p => p.category).filter(Boolean)));
    
    let html = `<button class="cat-chip ${state.currentCategory === 'All' ? 'active' : ''}" data-cat="All">All</button>`;
    categories.forEach(cat => {
        const isAct = state.currentCategory === cat ? 'active' : '';
        html += `<button class="cat-chip ${isAct}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });
    container.innerHTML = html;

    container.querySelectorAll(".cat-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            container.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            state.currentCategory = chip.dataset.cat;
            filterCatalog();
        });
    });
}

function populateCategoryDropdown(selectedVal = "") {
    const select = document.getElementById("input-prod-category");
    if (!select) return;

    const currentVal = selectedVal || select.value;
    const cats = state.categories && state.categories.length > 0 ? state.categories : ["Sarees", "Fabrics"];

    let optionsHtml = `<option value="" disabled ${!currentVal ? "selected" : ""}>-- Select Category --</option>`;
    cats.forEach(c => {
        const isSel = currentVal && currentVal.toLowerCase() === c.toLowerCase() ? "selected" : "";
        optionsHtml += `<option value="${escapeHtml(c)}" ${isSel}>${escapeHtml(c)}</option>`;
    });
    optionsHtml += `<option value="__ADD_NEW__">+ Add New Category...</option>`;
    select.innerHTML = optionsHtml;
}

function renderModalCategoriesList() {
    const container = document.getElementById("modal-categories-list");
    const countBadge = document.getElementById("categories-count-badge");
    if (!container) return;

    const cats = state.categories || [];
    if (countBadge) countBadge.textContent = cats.length;

    if (cats.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 20px 10px; color: #94A3B8; font-size: 12px;">
                No categories added yet. Type a name above to create one.
            </div>
        `;
        return;
    }

    container.innerHTML = cats.map(cat => `
        <div class="category-item-row">
            <div class="cat-item-left">
                <span class="cat-bullet-dot"></span>
                <span class="cat-item-name">${escapeHtml(cat)}</span>
            </div>
            <button type="button" class="btn-cat-delete" title="Delete category" onclick="window.handleDeleteCategory('${escapeHtml(cat)}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
    `).join("");
}

function setupCategoryModalHandlers() {
    // Open modal buttons
    document.getElementById("btn-open-manage-categories")?.addEventListener("click", openCategoryModal);
    document.getElementById("btn-quick-add-category-link")?.addEventListener("click", openCategoryModal);

    // Close modal buttons
    document.getElementById("btn-close-category-modal")?.addEventListener("click", closeCategoryModal);
    document.getElementById("btn-done-categories")?.addEventListener("click", closeCategoryModal);

    // Add category trigger
    document.getElementById("btn-submit-new-category")?.addEventListener("click", handleAddCategorySubmit);
    document.getElementById("input-new-category-name")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddCategorySubmit();
        }
    });

    // Handle selecting "+ Add New Category..." from dropdown in Add Product modal
    const catSelect = document.getElementById("input-prod-category");
    catSelect?.addEventListener("change", (e) => {
        if (e.target.value === "__ADD_NEW__") {
            openCategoryModal();
            // Reset to previous/empty selection temporarily until user adds
            catSelect.value = "";
        }
    });
}

function openCategoryModal() {
    const modal = document.getElementById("modal-categories");
    const input = document.getElementById("input-new-category-name");
    if (input) input.value = "";
    renderModalCategoriesList();
    modal?.classList.add("active");
    setTimeout(() => input?.focus(), 150);
}
window.openCategoryModal = openCategoryModal;

function closeCategoryModal() {
    document.getElementById("modal-categories")?.classList.remove("active");
}
window.closeCategoryModal = closeCategoryModal;

async function handleAddCategorySubmit() {
    const input = document.getElementById("input-new-category-name");
    const name = input?.value.trim();
    if (!name) {
        window.showToast("Please enter a category name");
        input?.focus();
        return;
    }

    // Check if category already exists in state
    if (state.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
        window.showToast(`Category "${name}" already exists`);
        populateCategoryDropdown(name);
        return;
    }

    try {
        const res = await fetch("/api/billing/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        if (res.ok) {
            const data = await res.json();
            const addedName = data.name || name;
            state.categories.push(addedName);
        } else {
            state.categories.push(name);
        }
    } catch (e) {
        state.categories.push(name);
    }

    if (input) input.value = "";
    renderCategoryChips();
    renderModalCategoriesList();
    populateCategoryDropdown(name);
    window.showToast(`Category "${name}" added!`);
}

window.handleDeleteCategory = async (catName) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
        await fetch(`/api/billing/categories/${encodeURIComponent(catName)}`, {
            method: "DELETE"
        });
    } catch (e) {}

    state.categories = state.categories.filter(c => c.toLowerCase() !== catName.toLowerCase());
    if (state.currentCategory.toLowerCase() === catName.toLowerCase()) {
        state.currentCategory = "All";
    }

    renderCategoryChips();
    renderModalCategoriesList();
    populateCategoryDropdown();
    filterCatalog();
    window.showToast(`Category "${catName}" removed`);
};

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

    updateBulkActionBar();

    if (!state.products.length) {
        container.innerHTML = `
            <div class="empty-catalog-box">
                <div class="empty-catalog-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <div class="empty-catalog-title">No Products in Catalog</div>
                <div class="empty-catalog-desc">Your POS catalog is clean and ready. Tap below to add your first product, saree, or fabric.</div>
                <button type="button" class="btn-apple-primary" onclick="window.openAddProductModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Add First Product</span>
                </button>
            </div>
        `;
        return;
    }

    if (!state.filteredProducts.length) {
        container.innerHTML = `
            <div class="empty-catalog-box" style="padding: 24px;">
                <div style="font-size:14px; font-weight:700; color:#475569;">No products matching filter</div>
                <div style="font-size:11px; color:#94A3B8; margin-top:4px;">Try searching for another keyword or select "All" categories.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = state.filteredProducts.map(p => {
        const catBadgeClass = getBadgeClass(p.category || p.subcategory);
        const subBadgeClass = getBadgeClass(p.subcategory);
        const imgUrl = p.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80";
        const isSelected = state.selectedProductIds.has(p.id);

        return `
            <div class="product-row-card ${isSelected ? "selected" : ""}" id="prod-card-${p.id}" onclick="window.handleProductCardClick('${p.id}')">
                <!-- Checkbox for Multi-Select -->
                <label class="prod-select-checkbox-wrap" onclick="event.stopPropagation()">
                    <input type="checkbox" class="prod-select-checkbox" data-id="${p.id}" ${isSelected ? "checked" : ""} onchange="window.handleProductCheckboxChange('${p.id}', this.checked, event)">
                    <span class="custom-prod-checkbox"></span>
                </label>

                <img class="prod-thumb-img" src="${imgUrl}" alt="${escapeHtml(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80'">
                
                <div class="prod-info-block">
                    <div class="prod-title">${escapeHtml(p.name)}</div>
                    <div class="prod-sku-line">SKU: ${escapeHtml(p.sku)}</div>
                    <div class="prod-barcode-line">Barcode: ${escapeHtml(p.barcode || "N/A")}</div>
                    <div class="prod-tag-badges">
                        <span class="prod-badge ${catBadgeClass}">${escapeHtml(p.category)}</span>
                        ${p.subcategory ? `<span class="prod-badge ${subBadgeClass}">${escapeHtml(p.subcategory)}</span>` : ""}
                    </div>
                </div>

                <div class="prod-pricing-side">
                    <div class="prod-price">₹ ${(p.price).toLocaleString("en-IN")}</div>
                    <div class="prod-stock-tag">Stock: ${p.stock || 0}</div>
                    
                    <!-- 3-Dots Menu with 1. Print Label, 2. Delete, 3. Update -->
                    <div class="prod-menu-wrapper" onclick="event.stopPropagation()">
                        <button type="button" class="prod-menu-btn" title="Product Actions" onclick="window.toggleProductActionMenu('${p.id}', event)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                        </button>
                        <div class="prod-action-dropdown" id="prod-menu-${p.id}" style="display: none;">
                            <button type="button" class="prod-dropdown-item" onclick="window.handleMenuPrintLabel('${p.id}', event)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                                <span>1. Print Label</span>
                            </button>
                            <button type="button" class="prod-dropdown-item delete" onclick="window.handleMenuDeleteProduct('${p.id}', event)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                <span>2. Delete</span>
                            </button>
                            <button type="button" class="prod-dropdown-item update" onclick="window.handleMenuUpdateProduct('${p.id}', event)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                <span>3. Update</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// --- MULTI-SELECT HANDLERS ---
window.handleProductCheckboxChange = (id, isChecked, event) => {
    if (event) event.stopPropagation();
    if (isChecked) {
        state.selectedProductIds.add(id);
    } else {
        state.selectedProductIds.delete(id);
    }
    const card = document.getElementById(`prod-card-${id}`);
    if (card) {
        if (isChecked) card.classList.add("selected");
        else card.classList.remove("selected");
    }
    updateBulkActionBar();
};

function updateBulkActionBar() {
    const bar = document.getElementById("products-bulk-actions-bar");
    const countBadge = document.getElementById("bulk-selected-count");
    const countText = document.getElementById("bulk-selected-text");
    if (!bar) return;

    const count = state.selectedProductIds.size;
    if (count > 0) {
        bar.style.display = "flex";
        if (countBadge) countBadge.textContent = count;
        if (countText) countText.textContent = count === 1 ? "product selected" : "products selected";
    } else {
        bar.style.display = "none";
    }
}

function clearProductSelection() {
    state.selectedProductIds.clear();
    renderCatalog();
}

async function handleBulkPrintLabels() {
    if (state.selectedProductIds.size === 0) {
        window.showToast("No products selected");
        return;
    }
    const selectedList = state.products.filter(p => state.selectedProductIds.has(p.id));
    if (selectedList.length === 1) {
        openBarcodeLabelModal(selectedList[0]);
    } else {
        openBarcodeLabelModal(selectedList[0], selectedList);
        window.showToast(`Loaded ${selectedList.length} selected products for printing`);
    }
}

async function handleBulkDeleteProducts() {
    const count = state.selectedProductIds.size;
    if (count === 0) {
        window.showToast("No products selected");
        return;
    }

    if (!confirm(`Are you sure you want to delete ${count} selected products? This cannot be undone.`)) {
        return;
    }

    window.showToast(`Deleting ${count} products...`);
    const idsToDelete = Array.from(state.selectedProductIds);

    for (const id of idsToDelete) {
        try {
            await fetch(`/api/billing/products/${id}`, { method: "DELETE" });
        } catch (e) {
            console.error("Delete failed for product ID:", id, e);
        }
    }

    state.products = state.products.filter(p => !state.selectedProductIds.has(p.id));
    state.filteredProducts = state.filteredProducts.filter(p => !state.selectedProductIds.has(p.id));
    state.selectedProductIds.clear();
    renderCatalog();
    window.showToast(`${count} products deleted successfully!`);
}

// --- 3-DOTS ACTION MENU HANDLERS ---
window.toggleProductActionMenu = (id, event) => {
    if (event) event.stopPropagation();
    const currentMenu = document.getElementById(`prod-menu-${id}`);
    const isCurrentlyOpen = currentMenu && currentMenu.style.display === "flex";

    closeAllProductMenus();

    if (currentMenu && !isCurrentlyOpen) {
        currentMenu.style.display = "flex";
    }
};

window.closeAllProductMenus = () => {
    document.querySelectorAll(".prod-action-dropdown").forEach(menu => {
        menu.style.display = "none";
    });
};

window.handleMenuPrintLabel = (id, event) => {
    if (event) event.stopPropagation();
    closeAllProductMenus();
    const product = state.products.find(p => p.id === id);
    if (product) openBarcodeLabelModal(product);
};

window.handleMenuDeleteProduct = async (id, event) => {
    if (event) event.stopPropagation();
    closeAllProductMenus();
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/billing/products/${id}`, { method: "DELETE" });
        if (res.ok) {
            state.products = state.products.filter(p => p.id !== id);
            state.filteredProducts = state.filteredProducts.filter(p => p.id !== id);
            state.selectedProductIds.delete(id);
            renderCatalog();
            window.showToast(`Product "${product.name}" deleted`);
        } else {
            window.showToast("Failed to delete product");
        }
    } catch (e) {
        console.error("Delete product error:", e);
        window.showToast("Error deleting product");
    }
};

window.handleMenuUpdateProduct = (id, event) => {
    if (event) event.stopPropagation();
    closeAllProductMenus();
    const product = state.products.find(p => p.id === id);
    if (product) openEditProductModal(product);
};

function openEditProductModal(product) {
    const modal = document.getElementById("modal-add-product");
    const form = document.getElementById("form-product-details");
    form.reset();

    document.getElementById("input-product-id").value = product.id;
    document.getElementById("modal-product-title").textContent = "Update Product";
    document.getElementById("btn-save-product-submit").textContent = "Update Product";

    document.getElementById("input-prod-name").value = product.name || "";
    document.getElementById("input-prod-sku").value = product.sku || "";
    document.getElementById("input-prod-price").value = product.price || "";
    document.getElementById("input-prod-stock").value = product.stock !== undefined ? product.stock : 10;

    populateCategoryDropdown(product.category || "");

    const previewImg = document.getElementById("r2-photo-preview");
    const placeholder = document.getElementById("r2-photo-placeholder");
    if (product.image_url) {
        if (previewImg) {
            previewImg.src = product.image_url;
            previewImg.dataset.r2Url = product.image_url;
            previewImg.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";
    } else {
        if (previewImg) previewImg.style.display = "none";
        if (placeholder) placeholder.style.display = "flex";
    }

    modal?.classList.add("active");
}
window.openEditProductModal = openEditProductModal;

const BADGE_COLOR_PALETTES = [
    "badge-silk", "badge-sarees", "badge-cotton", "badge-banarasi", "badge-tussar", "badge-georgette"
];

function getBadgeClass(tag) {
    if (!tag) return "badge-silk";
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % BADGE_COLOR_PALETTES.length;
    return BADGE_COLOR_PALETTES[index];
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
    
    // Prevent accidental reload if Enter pressed
    document.getElementById("form-product-details")?.addEventListener("submit", (e) => {
        e.preventDefault();
        submitAddProduct();
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
                } else {
                    console.warn("R2 Upload returned error:", data);
                    window.showToast("Photo cached locally");
                }
            } catch (err) {
                console.error("R2 Upload Error:", err);
                window.showToast("Photo cached locally");
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
    document.getElementById("btn-save-customer")?.addEventListener("click", async () => {
        const name = document.getElementById("cust-modal-name").value.trim();
        const phone = document.getElementById("cust-modal-phone").value.trim();
        const address = document.getElementById("cust-modal-address").value.trim();

        if (name || phone) {
            state.selectedCustomer = { name: name || "Customer", phone, address };
            document.getElementById("current-customer-label").textContent = name || phone;

            // Also persist customer to database if new
            try {
                await fetch("/api/billing/customers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: name || "Customer", phone, address })
                });
                await loadCustomers();
            } catch (e) {}

            window.showToast("Customer attached to bill");
        }
        closeCustomerModal();
    });

    document.getElementById("btn-close-review-modal")?.addEventListener("click", closeReviewBillModal);
    document.getElementById("btn-review-back")?.addEventListener("click", closeReviewBillModal);
    document.getElementById("btn-review-confirm-print")?.addEventListener("click", async () => {
        const paymentMode = document.getElementById("review-payment-mode")?.value || "CASH";
        closeReviewBillModal();
        await executeDirectPrintAndSettle(paymentMode);
    });

    // Label Print Modal
    document.getElementById("btn-close-label-modal")?.addEventListener("click", closeBarcodeLabelModal);
    document.getElementById("btn-cancel-label-print")?.addEventListener("click", closeBarcodeLabelModal);
    document.getElementById("select-label-product")?.addEventListener("change", (e) => {
        const prodId = e.target.value;
        if (prodId === "__ALL_SELECTED__") {
            if (state.multiSelectedForPrint && state.multiSelectedForPrint.length > 0) {
                updateLabelModalPreview(state.multiSelectedForPrint[0]);
            }
        } else {
            const product = state.products.find(p => p.id === prodId);
            if (product) updateLabelModalPreview(product);
        }
    });
    document.getElementById("btn-execute-label-print")?.addEventListener("click", async () => {
        const copies = Math.max(1, Number(document.getElementById("input-label-copies").value || 1));
        const selectVal = document.getElementById("select-label-product")?.value;
        
        if (selectVal === "__ALL_SELECTED__" && state.multiSelectedForPrint?.length > 0) {
            await executePrint50x25mmLabelDirect(state.multiSelectedForPrint, copies);
            closeBarcodeLabelModal();
        } else {
            const productId = selectVal || document.getElementById("modal-print-label").dataset.productId;
            const product = state.products.find(p => p.id === productId);
            if (product) {
                await executePrint50x25mmLabelDirect(product, copies);
                closeBarcodeLabelModal();
            } else {
                window.showToast("Please select a product first");
            }
        }
    });

    document.getElementById("btn-close-printer-modal")?.addEventListener("click", closePrinterSettingsModal);
    document.getElementById("btn-close-printer-settings")?.addEventListener("click", closePrinterSettingsModal);
    document.getElementById("btn-connect-bluetooth")?.addEventListener("click", connectWebBluetoothPrinter);
}

function openAddProductModal() {
    const modal = document.getElementById("modal-add-product");
    const form = document.getElementById("form-product-details");
    form.reset();
    document.getElementById("input-product-id").value = "";
    document.getElementById("modal-product-title").textContent = "Add Product";
    document.getElementById("btn-save-product-submit").textContent = "Save Product";
    const previewImg = document.getElementById("r2-photo-preview");
    if (previewImg) {
        previewImg.style.display = "none";
        previewImg.removeAttribute("data-r2-url");
        previewImg.src = "";
    }
    const placeholder = document.getElementById("r2-photo-placeholder");
    if (placeholder) placeholder.style.display = "flex";
    
    // Auto-generate a clean SKU if empty
    const skuField = document.getElementById("input-prod-sku");
    if (skuField) {
        skuField.value = "SKU-" + Math.floor(100000 + Math.random() * 900000);
    }

    // Populate category dropdown
    populateCategoryDropdown();
    
    modal?.classList.add("active");
}
window.openAddProductModal = openAddProductModal;

function closeAddProductModal() {
    document.getElementById("modal-add-product")?.classList.remove("active");
}

async function submitAddProduct() {
    const saveBtn = document.getElementById("btn-save-product-submit");
    const editId = document.getElementById("input-product-id").value.trim();
    const name = document.getElementById("input-prod-name").value.trim();
    const sku = document.getElementById("input-prod-sku").value.trim();
    const barcode = sku;
    const category = (document.getElementById("input-prod-category")?.value || "General").trim();
    const subcategory = "";
    const rawPrice = document.getElementById("input-prod-price").value;
    const price = Number(rawPrice);
    const stock = Number(document.getElementById("input-prod-stock").value || 0);
    const description = "";
    const previewImg = document.getElementById("r2-photo-preview");
    const shouldPrintLabel = document.getElementById("toggle-print-label-after-add")?.checked;

    if (!name || !sku || !rawPrice || isNaN(price) || price < 0) {
        window.showToast("Please fill in Name, SKU, and a valid Price (*)");
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = editId ? "Updating..." : "Saving...";
    }

    try {
        let image_url = previewImg?.dataset?.r2Url || previewImg?.src || "";
        if (!image_url || image_url.startsWith("data:") || image_url === window.location.href) {
            image_url = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80";
        }

        const isUpdate = Boolean(editId);
        const url = isUpdate ? `/api/billing/products/${editId}` : "/api/billing/products";
        const method = isUpdate ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
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
            const saved = await res.json();
            if (isUpdate) {
                const idx = state.products.findIndex(p => p.id === editId);
                if (idx !== -1) state.products[idx] = saved;
                window.showToast("Product updated successfully!");
            } else {
                state.products.unshift(saved);
                window.showToast("Product added successfully!");
            }
            state.filteredProducts = [...state.products];
            renderCatalog();
            closeAddProductModal();

            if (shouldPrintLabel && !isUpdate) {
                setTimeout(() => openBarcodeLabelModal(saved), 300);
            }
        } else {
            const errData = await res.json().catch(() => ({}));
            window.showToast("Error: " + (errData.error || "Failed to save product"));
        }
    } catch (e) {
        console.error("Save product failed:", e);
        window.showToast("Network error: Failed to save product");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = editId ? "Update Product" : "Save Product";
        }
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

function openBarcodeLabelModal(product, multiProducts = null) {
    const modal = document.getElementById("modal-print-label");
    const select = document.getElementById("select-label-product");
    state.multiSelectedForPrint = multiProducts || null;

    if (select) {
        let optionsHtml = "";
        if (multiProducts && multiProducts.length > 1) {
            optionsHtml += `<option value="__ALL_SELECTED__">✨ Print All (${multiProducts.length} Selected Products)</option>`;
        }
        optionsHtml += state.products.map(p => 
            `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.sku)}) - ₹${p.price.toLocaleString("en-IN")}</option>`
        ).join("");

        select.innerHTML = optionsHtml;

        if (multiProducts && multiProducts.length > 1) {
            select.value = "__ALL_SELECTED__";
            product = multiProducts[0];
        } else if (product) {
            select.value = product.id;
        } else if (state.products.length > 0) {
            select.value = state.products[0].id;
            product = state.products[0];
        }
    }

    if (product) {
        updateLabelModalPreview(product);
    }

    modal?.classList.add("active");
}
window.openBarcodeLabelModal = openBarcodeLabelModal;

function updateLabelModalPreview(product) {
    const modal = document.getElementById("modal-print-label");
    if (!modal || !product) return;
    modal.dataset.productId = product.id;

    const storeEl = document.getElementById("preview-label-store");
    const nameEl = document.getElementById("preview-label-name");
    const skuEl = document.getElementById("preview-label-sku");
    const priceEl = document.getElementById("preview-label-price");

    if (storeEl) storeEl.textContent = (state.storeSettings?.store_name || "INDRITA FABRICS").toUpperCase();
    if (nameEl) nameEl.textContent = product.name || "Product";
    if (skuEl) skuEl.textContent = `SKU: ${product.sku || "IF001"}`;
    if (priceEl) priceEl.textContent = `₹ ${(product.price || 0).toLocaleString("en-IN")}`;

    const qrData = String(product.barcode || product.sku || product.id || "IF001");
    const qrCanvas = document.getElementById("preview-label-qr-canvas");

    if (qrCanvas && QRCode) {
        QRCode.toCanvas(qrCanvas, qrData, {
            width: 120,
            margin: 0,
            color: {
                dark: "#000000",
                light: "#ffffff"
            },
            errorCorrectionLevel: "M"
        }, function(err) {
            if (err) console.warn("QRCode preview error:", err);
        });
    }
}

function closeBarcodeLabelModal() {
    state.multiSelectedForPrint = null;
    document.getElementById("modal-print-label")?.classList.remove("active");
}

// --- CUSTOMERS DIRECTORY MANAGEMENT ---
async function loadCustomers() {
    try {
        const res = await fetch("/api/billing/customers");
        if (res.ok) {
            state.customers = await res.json();
            state.filteredCustomers = [...state.customers];
            renderCustomersView();
        }
    } catch (e) {
        console.warn("Could not load customers:", e);
    }
}

function filterCustomers(query) {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
        state.filteredCustomers = [...state.customers];
    } else {
        state.filteredCustomers = state.customers.filter(c => 
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.address && c.address.toLowerCase().includes(q))
        );
    }
    renderCustomersView();
}

function renderCustomersView() {
    const container = document.getElementById("customers-list-container");
    if (!container) return;

    if (!state.customers.length) {
        container.innerHTML = `
            <div class="empty-catalog-box">
                <div class="empty-catalog-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="empty-catalog-title">No Customers Found</div>
                <div class="empty-catalog-desc">Customer profiles created during checkout will appear here. You can also add a customer profile now.</div>
                <button type="button" class="btn-apple-primary" onclick="openCustomerModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Add New Customer</span>
                </button>
            </div>
        `;
        return;
    }

    if (!state.filteredCustomers.length) {
        container.innerHTML = `
            <div class="empty-catalog-box" style="padding: 24px;">
                <div style="font-size:14px; font-weight:700; color:#475569;">No matching customers</div>
                <div style="font-size:11px; color:#94A3B8; margin-top:4px;">Try searching by another phone number or name.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = state.filteredCustomers.map(c => `
        <div class="product-row-card" style="cursor: pointer;" onclick="window.selectCustomerForBill('${c.id}')">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #F3E8FF; color: #9333EA; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0;">
                ${(c.name || "C")[0].toUpperCase()}
            </div>
            <div class="prod-info-block">
                <div class="prod-title">${escapeHtml(c.name || "Walk-in Customer")}</div>
                <div class="prod-sku-line">${escapeHtml(c.phone || "No phone")}</div>
                <div class="prod-barcode-line">${escapeHtml(c.address || "No address on file")}</div>
            </div>
            <button type="button" class="btn-apple-primary" style="padding: 6px 12px; font-size: 11.5px; border-radius: 8px;">
                Select
            </button>
        </div>
    `).join("");
}

window.selectCustomerForBill = (customerId) => {
    const customer = state.customers.find(c => c.id === customerId);
    if (customer) {
        state.selectedCustomer = customer;
        const custLabel = document.getElementById("current-customer-label");
        if (custLabel) custLabel.textContent = customer.name || customer.phone;
        window.showToast(`Customer "${customer.name || customer.phone}" attached`);
        switchView("new-bill");
    }
};

function openPrinterSettingsModal() {
    document.getElementById("modal-printer-settings")?.classList.add("active");
}
function closePrinterSettingsModal() {
    document.getElementById("modal-printer-settings")?.classList.remove("active");
}

function handlePrinterButtonClick() {
    if (!state.printer.isConnected) {
        connectWebBluetoothPrinter();
    } else {
        openPrinterSettingsModal();
    }
}

// --- SCANNER SCREEN & CAMERA LOGIC ---
let scannerFacingMode = "environment";

function setupScannerTools() {
    document.getElementById("btn-toggle-flash")?.addEventListener("click", toggleCameraFlash);

    // Flip camera (back <-> front)
    document.getElementById("btn-flip-camera")?.addEventListener("click", async () => {
        scannerFacingMode = scannerFacingMode === "environment" ? "user" : "environment";
        stopCameraScanner();
        await startCameraScanner();
        window.showToast(`Switched to ${scannerFacingMode === "user" ? "Front" : "Back"} camera`);
    });

    // Scanner cart pill click -> jump to review bill
    document.getElementById("scanner-cart-pill")?.addEventListener("click", () => {
        stopCameraScanner();
        switchView("new-bill");
    });

    // Quick Manual SKU search in Scanner HUD
    document.getElementById("form-quick-sku-scan")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("input-quick-sku-val");
        const code = input ? input.value.trim() : "";
        if (!code) return;
        handleScannedBarcode(code);
        if (input) input.value = "";
    });

    // Scan Barcode from Photo / Gallery
    const galleryInput = document.getElementById("scanner-gallery-input");
    document.getElementById("btn-upload-gallery")?.addEventListener("click", () => galleryInput?.click());
    
    galleryInput?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            if ("BarcodeDetector" in window) {
                try {
                    const detector = new window.BarcodeDetector({
                        formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"]
                    });
                    const barcodes = await detector.detect(img);
                    if (barcodes && barcodes.length > 0) {
                        handleScannedBarcode(barcodes[0].rawValue);
                        return;
                    }
                } catch (err) {
                    console.warn("Photo barcode detect error:", err);
                }
            }
            window.showToast("No barcode/QR found in selected image.");
        };
    });

    // Scanned Bottom Sheet Quantity Stepper
    document.getElementById("btn-scanned-qty-minus")?.addEventListener("click", () => {
        if (state.lastScannedProduct) {
            const item = state.cart.find(c => c.id === state.lastScannedProduct.id);
            if (item) {
                updateCartItemQty(item.id, item.qty - 1);
                const updated = state.cart.find(c => c.id === state.lastScannedProduct.id);
                const qtyNum = document.getElementById("scanned-qty-number");
                if (qtyNum) qtyNum.textContent = updated ? updated.qty : 0;
            }
        }
    });

    document.getElementById("btn-scanned-qty-plus")?.addEventListener("click", () => {
        if (state.lastScannedProduct) {
            const item = state.cart.find(c => c.id === state.lastScannedProduct.id);
            if (item) {
                updateCartItemQty(item.id, item.qty + 1);
                const updated = state.cart.find(c => c.id === state.lastScannedProduct.id);
                const qtyNum = document.getElementById("scanned-qty-number");
                if (qtyNum) qtyNum.textContent = updated ? updated.qty : 1;
            } else {
                addToCart(state.lastScannedProduct, 1);
                const qtyNum = document.getElementById("scanned-qty-number");
                if (qtyNum) qtyNum.textContent = 1;
            }
        }
    });

    document.getElementById("btn-scan-next-product")?.addEventListener("click", () => {
        const sheet = document.getElementById("scanner-bottom-sheet");
        if (sheet) sheet.style.display = "none";
        window.showToast("Ready for next scan");
    });

    document.getElementById("btn-scan-finish-done")?.addEventListener("click", () => {
        stopCameraScanner();
        switchView("new-bill");
    });
}

function updateScannerCartSummary() {
    const totalCount = state.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const totalPrice = state.cart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);
    const pillText = document.getElementById("scanner-cart-summary-text");
    if (pillText) {
        pillText.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'} • ₹ ${totalPrice.toLocaleString("en-IN")}`;
    }
    const doneSub = document.getElementById("scan-done-items-sub");
    if (doneSub) {
        doneSub.textContent = `Review Bill (${totalCount} item${totalCount === 1 ? '' : 's'})`;
    }
}

async function startCameraScanner() {
    const video = document.getElementById("camera-video-feed");
    const sheet = document.getElementById("scanner-bottom-sheet");
    if (sheet) sheet.style.display = "none";
    if (!video) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: scannerFacingMode,
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
        console.warn("Camera access:", err);
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
        // frame decode
    }

    if (state.scanner.isScanning) {
        requestAnimationFrame(() => detectBarcodeLoop(video));
    }
}

function handleScannedBarcode(barcodeVal) {
    const cleanVal = barcodeVal.trim().toLowerCase();
    const product = state.products.find(p => 
        (p.barcode && p.barcode.toLowerCase() === cleanVal) || 
        (p.sku && p.sku.toLowerCase() === cleanVal)
    );
    
    if (!product) {
        window.showToast(`Product "${barcodeVal}" not found in catalog.`);
        return;
    }

    playBeep();
    addToCart(product, 1);
    updateScannerBottomSheet(product);
}

function updateScannerBottomSheet(product) {
    const sheet = document.getElementById("scanner-bottom-sheet");
    if (sheet) sheet.style.display = "block";
    const imgEl = document.getElementById("scanned-item-img");
    if (imgEl) imgEl.src = product.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80";
    document.getElementById("scanned-item-name").textContent = product.name;
    document.getElementById("scanned-item-sku").textContent = `SKU: ${product.sku}`;
    document.getElementById("scanned-item-price").textContent = `₹ ${(product.price).toLocaleString("en-IN")}`;
    
    const itemInCart = state.cart.find(c => c.id === product.id);
    const qtyNum = document.getElementById("scanned-qty-number");
    if (qtyNum) qtyNum.textContent = itemInCart ? itemInCart.qty : 1;

    updateScannerCartSummary();
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

// =========================================================================
// DEV 2IN1 58MM THERMAL PRINTER HARDWARE ENGINE (MODEL: 632-L58P, 203 DPI)
// DIRECT WEB BLUETOOTH ESC/POS & TSPL RAW BYTE SENDER
// =========================================================================

function setupPrinterControls() {
    updatePrinterStatusUI();
}

function updatePrinterStatusUI() {
    const pill = document.getElementById("btn-header-printer-status");
    const pillText = document.getElementById("printer-pill-text");
    const pillDot = document.getElementById("printer-pill-dot");
    
    // Home Bluetooth Printer Card Elements
    const cardStatusText = document.getElementById("card-printer-status-text");
    const cardStatusDot = document.getElementById("card-printer-status-dot");
    const cardStatusLabel = document.getElementById("card-printer-status-label");
    const cardModelText = document.getElementById("card-printer-model-text");
    const cardBtnText = document.getElementById("btn-card-connect-printer-text");

    // More / Settings Elements
    const moreStatusText = document.getElementById("more-printer-status-text");
    const moreStatusBadge = document.getElementById("more-printer-status-badge");
    const quickHwStatus = document.getElementById("settings-quick-hardware-status");
    const quickHwPill = document.getElementById("settings-quick-hardware-pill");

    if (state.printer.isConnected) {
        pill?.classList.remove("disconnected");
        if (pillText) pillText.textContent = "Connected";
        if (pillDot) pillDot.className = "pulse-dot";
        
        if (cardStatusDot) cardStatusDot.className = "pulse-dot";
        if (cardStatusLabel) cardStatusLabel.textContent = "Connected";
        if (cardStatusText) cardStatusText.className = "printer-status-row online";
        if (cardModelText) cardModelText.textContent = `${state.printer.deviceName || "DEV 2IN1 632-L58P"} (203 DPI, 58mm)`;
        if (cardBtnText) cardBtnText.textContent = "Printer Settings";

        if (moreStatusText) moreStatusText.textContent = `${state.printer.deviceName || "DEV 2IN1"} Connected`;
        if (moreStatusBadge) moreStatusBadge.className = "hardware-status-badge online";
        if (quickHwStatus) quickHwStatus.textContent = "Printer Online";
        if (quickHwPill) quickHwPill.style.borderColor = "#10B981";
    } else {
        pill?.classList.add("disconnected");
        if (pillText) pillText.textContent = "Not Connected";
        if (pillDot) pillDot.className = "pulse-dot red";

        if (cardStatusDot) cardStatusDot.className = "pulse-dot red";
        if (cardStatusLabel) cardStatusLabel.textContent = "Not Connected";
        if (cardStatusText) cardStatusText.className = "printer-status-row";
        if (cardModelText) cardModelText.textContent = "Tap to pair your printer";
        if (cardBtnText) cardBtnText.textContent = "Connect Printer";

        if (moreStatusText) moreStatusText.textContent = "Web Bluetooth Ready (Disconnected)";
        if (moreStatusBadge) moreStatusBadge.className = "hardware-status-badge";
        if (quickHwStatus) quickHwStatus.textContent = "Printer Ready";
        if (quickHwPill) quickHwPill.style.borderColor = "var(--border-subtle)";
    }
}

// Web Bluetooth Direct Pairing
async function connectWebBluetoothPrinter() {
    if (!navigator.bluetooth) {
        window.showToast("Web Bluetooth requires Chrome / Edge on Android, Mac, or Windows.");
        return false;
    }

    try {
        window.showToast("Searching for DEV 2IN1 632-L58P...");
        
        // Scan for printer with standard Bluetooth thermal printer services
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                "000018f0-0000-1000-8000-00805f9b34fb",
                "49535343-fe7d-4ae5-8fa9-9fafd205e455",
                "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
                "0000ff00-0000-1000-8000-00805f9b34fb",
                "0000ae00-0000-1000-8000-00805f9b34fb",
                "0000fee7-0000-1000-8000-00805f9b34fb",
                "0000fff0-0000-1000-8000-00805f9b34fb"
            ]
        });

        window.showToast(`Connecting to ${device.name || "printer"}...`);
        const server = await device.gatt.connect();
        
        // Find write characteristic
        let writeChar = null;
        const services = await server.getPrimaryServices();
        
        for (const service of services) {
            try {
                const chars = await service.getCharacteristics();
                for (const char of chars) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        writeChar = char;
                        break;
                    }
                }
            } catch (e) {}
            if (writeChar) break;
        }

        if (!writeChar) {
            throw new Error("Could not find writable printer characteristic");
        }

        state.printer.device = device;
        state.printer.server = server;
        state.printer.characteristic = writeChar;
        state.printer.deviceName = device.name || "DEV 2IN1 632-L58P";
        state.printer.isConnected = true;

        device.addEventListener("gattserverdisconnected", () => {
            state.printer.isConnected = false;
            state.printer.characteristic = null;
            updatePrinterStatusUI();
            window.showToast("Printer disconnected");
        });

        updatePrinterStatusUI();
        window.showToast(`Connected to ${state.printer.deviceName}! Ready to print.`);
        return true;
    } catch (err) {
        console.error("Bluetooth Pairing Error:", err);
        window.showToast(err.name === "NotFoundError" ? "Pairing cancelled" : "Connection failed: " + err.message);
        return false;
    }
}

// Send Raw Byte Chunks directly to Bluetooth GATT Characteristic
async function sendRawBytesToPrinter(uint8Array) {
    if (!state.printer.isConnected || !state.printer.characteristic) {
        const connected = await connectWebBluetoothPrinter();
        if (!connected) {
            throw new Error("Printer not connected");
        }
    }

    const characteristic = state.printer.characteristic;
    const CHUNK_SIZE = 64; // Standard BLE MTU safe packet size
    
    for (let offset = 0; offset < uint8Array.length; offset += CHUNK_SIZE) {
        const chunk = uint8Array.slice(offset, offset + CHUNK_SIZE);
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
        } else {
            await characteristic.writeValueWithResponse(chunk);
        }
        await new Promise(r => setTimeout(r, 15)); // Short delay to prevent buffer overflow
    }
}

// ESC/POS Command Byte Encoder Class
class EscPosBuilder {
    constructor() {
        this.bytes = [];
    }
    init() {
        this.bytes.push(0x1B, 0x40); // ESC @
        return this;
    }
    alignCenter() {
        this.bytes.push(0x1B, 0x61, 0x01);
        return this;
    }
    alignLeft() {
        this.bytes.push(0x1B, 0x61, 0x00);
        return this;
    }
    alignRight() {
        this.bytes.push(0x1B, 0x61, 0x02);
        return this;
    }
    bold(on = true) {
        this.bytes.push(0x1B, 0x45, on ? 1 : 0);
        return this;
    }
    doubleSize() {
        this.bytes.push(0x1D, 0x21, 0x11); // Double width + double height
        return this;
    }
    normalSize() {
        this.bytes.push(0x1D, 0x21, 0x00);
        return this;
    }
    text(str) {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(str);
        for (let i = 0; i < encoded.length; i++) {
            this.bytes.push(encoded[i]);
        }
        return this;
    }
    line(str = "") {
        this.text(str + "\n");
        return this;
    }
    feed(n = 3) {
        this.bytes.push(0x1B, 0x64, n);
        return this;
    }
    cut() {
        this.bytes.push(0x1D, 0x56, 0x42, 0x00);
        return this;
    }
    build() {
        return new Uint8Array(this.bytes);
    }
}

// Generate Raw 58mm ESC/POS Receipt Bytes (32 columns width for 58mm roll)
function build58mmEscPosReceipt(invoice, store) {
    const esc = new EscPosBuilder();
    const items = invoice.items || [];
    const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

    esc.init()
       .alignCenter()
       .bold(true)
       .doubleSize()
       .line(store.store_name || "INDRITA FABRICS")
       .normalSize()
       .line(store.tagline || "Tradition in Every Drape")
       .bold(false)
       .line(store.address || "Kolkata, West Bengal")
       .line(`Ph: ${store.phone || "+91 9876543210"}`);

    if (store.gst_number) {
        esc.line(`GSTIN: ${store.gst_number}`);
    }

    esc.line("--------------------------------")
       .alignLeft()
       .line(`Bill No : ${invoice.id || "INV-0001"}`)
       .line(`Date    : ${dateStr}`)
       .line(`Customer: ${invoice.customer_name || "Walk-in Customer"}`);

    if (invoice.customer_phone) {
        esc.line(`Phone   : ${invoice.customer_phone}`);
    }

    esc.line(`Payment : ${invoice.payment_method || "CASH"}`)
       .line("--------------------------------")
       .bold(true)
       .line("ITEM              QTY     AMOUNT")
       .line("--------------------------------")
       .bold(false);

    // 32 Characters wide row helper
    items.forEach(it => {
        const name = (it.name || "Item").substring(0, 32);
        esc.bold(true).line(name).bold(false);

        const skuPart = (`#${it.sku || ""}`).padEnd(12, " ");
        const qtyPart = (`${it.qty} x ${Number(it.price)}`).padEnd(10, " ");
        const totalPart = (`Rs.${Number(it.qty * it.price)}`).padStart(10, " ");
        esc.line(`${skuPart}${qtyPart}${totalPart}`);
    });

    esc.line("--------------------------------")
       .alignRight()
       .line(`Subtotal: Rs. ${Number(invoice.subtotal).toLocaleString("en-IN")}`);

    if (invoice.discount) {
        esc.line(`Discount: - Rs. ${Number(invoice.discount).toLocaleString("en-IN")}`);
    }

    if (invoice.gst_amount) {
        esc.line(`GST (${invoice.gst_rate || 18}%): Rs. ${Number(invoice.gst_amount).toLocaleString("en-IN")}`);
    }

    esc.line("--------------------------------")
       .bold(true)
       .line(`NET TOTAL: Rs. ${Number(invoice.total).toLocaleString("en-IN")}`)
       .bold(false)
       .line("--------------------------------")
       .alignCenter()
       .bold(true)
       .line("*** THANK YOU FOR SHOPPING ***")
       .bold(false)
       .line("Goods once sold can be exchanged")
       .line("within 7 days with original bill.")
       .line("--------------------------------")
       .feed(4)
       .cut();

    return esc.build();
}

// Render 50mm x 30mm label onto an offscreen canvas and convert to standard ESC/POS raster bitmap bytes
async function renderLabelToEscPosRaster(product, store) {
    const canvas = document.createElement("canvas");
    canvas.width = 384; // Standard 58mm thermal head width (48 bytes)
    canvas.height = 200; // Calibrated for 50x30mm sticker printable area
    const ctx = canvas.getContext("2d");

    // Pure white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 384, 200);

    // Dashed outer border perfectly centered with snug inset
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(4, 4, 376, 192);
    ctx.setLineDash([]);

    // Store Name Header (Top-centered, bold uppercase, snug at top)
    const storeTitle = (store?.store_name || "INDRITA FABRICS").trim().toUpperCase();
    ctx.fillStyle = "#000000";
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(storeTitle, 192, 16, 360);

    // Subtle horizontal divider under store name
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 30);
    ctx.lineTo(370, 30);
    ctx.stroke();

    // Render QR Code image (centered vertically in left column)
    const qrData = String(product.barcode || product.sku || product.id || "IF001");
    try {
        const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 140,
            margin: 0,
            errorCorrectionLevel: "M"
        });
        const qrImg = new Image();
        await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
            qrImg.src = qrDataUrl;
        });
        ctx.drawImage(qrImg, 14, 38, 140, 140);
    } catch (e) {
        console.warn("QR Code render error on canvas:", e);
    }

    // Right Column Info (centered horizontally in right half)
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Product Name
    ctx.font = "bold 22px Arial, sans-serif";
    const prodName = (product.name || "Test").substring(0, 16);
    ctx.fillText(prodName, 266, 62, 200);

    // SKU
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillStyle = "#333333";
    const skuText = `SKU: ${product.sku || "IF001"}`;
    ctx.fillText(skuText, 266, 102, 200);

    // Price
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillStyle = "#000000";
    const priceText = `Rs. ${Number(product.price || 0).toLocaleString("en-IN")}`;
    ctx.fillText(priceText, 266, 150, 200);

    // Convert Canvas to ESC/POS Raster Bytes (GS v 0)
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, 384, height);
    const data = imgData.data;
    const widthBytes = 48; // 384 / 8
    const rasterBytes = [];

    // ESC @ (Initialize)
    rasterBytes.push(0x1B, 0x40);
    // Align Center
    rasterBytes.push(0x1B, 0x61, 0x01);

    // GS v 0 0 xL xH yL yH
    rasterBytes.push(
        0x1D, 0x76, 0x30, 0x00,
        widthBytes & 0xFF,
        (widthBytes >> 8) & 0xFF,
        height & 0xFF,
        (height >> 8) & 0xFF
    );

    // 1 bit per pixel: 1 = black, 0 = white
    for (let y = 0; y < height; y++) {
        for (let xByte = 0; xByte < widthBytes; xByte++) {
            let byteVal = 0;
            for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit;
                const idx = (y * 384 + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
                if (a > 50 && brightness < 170) {
                    byteVal |= (0x80 >> bit);
                }
            }
            rasterBytes.push(byteVal);
        }
    }

    return new Uint8Array(rasterBytes);
}

// Execute Direct Print Bill & Settle Invoice
async function executeDirectPrintAndSettle(paymentMethod = "CASH") {
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
        window.showToast("Sending bill to DEV 2IN1 Printer...");
        
        // Save invoice in DB
        const res = await fetch("/api/billing/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(invoicePayload)
        });

        let savedInvoice = invoicePayload;
        if (res.ok) {
            savedInvoice = await res.json();
        }

        // Build ESC/POS bytes
        const receiptBytes = build58mmEscPosReceipt(savedInvoice, state.storeSettings);

        // Send directly to Bluetooth Printer
        try {
            await sendRawBytesToPrinter(receiptBytes);
            window.showToast(`Bill #${savedInvoice.id || "PAID"} printed directly on DEV 2IN1!`);
        } catch (bleErr) {
            console.warn("Direct Bluetooth print notice:", bleErr);
            // Fallback: render HTML receipt in DOM
            print58mmThermalReceiptFallback(savedInvoice);
        }

        // Reset Cart
        state.cart = [];
        state.selectedCustomer = null;
        document.getElementById("current-customer-label").textContent = "Customer (Optional)";
        renderCart();
        await loadProducts();
    } catch (e) {
        console.error("Print bill error:", e);
        window.showToast("Error processing bill: " + e.message);
    }
}

// Execute Direct 50mm x 30mm Graphic Label Print for DEV 2IN1 Printer
async function executePrint50x30mmLabelDirect(productOrList, copies = 1) {
    const products = Array.isArray(productOrList) ? productOrList : [productOrList];
    const totalLabels = products.length * copies;

    try {
        window.showToast(`Printing ${totalLabels} graphic label(s)...`);
        
        for (const prod of products) {
            for (let i = 0; i < copies; i++) {
                const labelBytes = await renderLabelToEscPosRaster(prod, state.storeSettings);
                try {
                    await sendRawBytesToPrinter(labelBytes);
                } catch (bleErr) {
                    // If Bluetooth not paired, fallback to visual browser print
                    await print50x30mmHtmlLabelFallback(productOrList, copies);
                    return;
                }
            }
        }
        window.showToast(`Printed ${totalLabels} label(s) on DEV 2IN1!`);
    } catch (e) {
        console.error("Label print error:", e);
        await print50x30mmHtmlLabelFallback(productOrList, copies);
    }
}
const executePrint50x25mmLabelDirect = executePrint50x30mmLabelDirect;

// Direct thermal receipt fallback renderer
function print58mmThermalReceiptFallback(invoice) {
    const store = state.storeSettings;
    const items = invoice.items || [];
    const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    const printContainer = document.getElementById("thermal-print-container");
    if (!printContainer) return;

    printContainer.className = "mode-receipt";
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
                        <span>${it.qty} x ${Number(it.price)}</span>
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

// 50mm x 30mm Exact Visual Thermal Label Renderer
async function print50x30mmHtmlLabelFallback(productOrList, copies = 1) {
    const store = state.storeSettings;
    const storeName = (store?.store_name || "INDRITA FABRICS").toUpperCase();
    const products = Array.isArray(productOrList) ? productOrList : [productOrList];
    const printContainer = document.getElementById("thermal-print-container");
    if (!printContainer) return;

    printContainer.className = "mode-label-50x30";
    let labelsHtml = "";
    const renderTasks = [];
    let idx = 0;

    for (const prod of products) {
        const qrData = String(prod.barcode || prod.sku || prod.id || "IF001");
        for (let c = 0; c < copies; c++) {
            const canvasId = `print-label-qr-${idx}`;
            labelsHtml += `
                <div class="print-label-50x30-wrapper">
                    <div class="print-label-50x30">
                        <div class="print-label-store">${escapeHtml(storeName)}</div>
                        <div class="print-label-body">
                            <div class="print-label-qr-wrap">
                                <canvas id="${canvasId}" width="130" height="130"></canvas>
                            </div>
                            <div class="print-label-info">
                                <div class="print-label-name">${escapeHtml(prod.name || "Test")}</div>
                                <div class="print-label-sku">SKU: ${escapeHtml(prod.sku || "IF001")}</div>
                                <div class="print-label-price">₹ ${Number(prod.price || 0).toLocaleString("en-IN")}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            renderTasks.push({ canvasId, qrData });
            idx++;
        }
    }

    printContainer.innerHTML = labelsHtml;

    // Render all QR codes on canvases
    for (const task of renderTasks) {
        const canvas = document.getElementById(task.canvasId);
        if (canvas && QRCode) {
            try {
                await QRCode.toCanvas(canvas, task.qrData, {
                    width: 130,
                    margin: 0,
                    color: { dark: "#000000", light: "#ffffff" },
                    errorCorrectionLevel: "M"
                });
            } catch (e) {
                console.warn("QR canvas print error:", e);
            }
        }
    }

    setTimeout(() => {
        window.print();
    }, 120);
}

// --- REPORTS & BILL HISTORY SCREEN ---
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
                const bytes = build58mmEscPosReceipt(inv, state.storeSettings);
                try {
                    await sendRawBytesToPrinter(bytes);
                    window.showToast(`Reprinted invoice #${invoiceId} on DEV 2IN1!`);
                } catch (e) {
                    print58mmThermalReceiptFallback(inv);
                }
            }
        }
    } catch (e) {
        console.error("Reprint error:", e);
    }
};

// --- MORE TAB & SYSTEM SETTINGS CONTROLLER ---
function setupMoreSettingsHandlers() {
    // Real-time live receipt preview updates
    document.querySelectorAll(".live-receipt-input").forEach(input => {
        input.addEventListener("input", updateReceiptLivePreview);
    });

    // Category Tabs Filtering
    document.querySelectorAll("#settings-category-tabs .settings-nav-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll("#settings-category-tabs .settings-nav-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const target = pill.getAttribute("data-target");
            document.querySelectorAll(".settings-apple-card").forEach(card => {
                const cat = card.getAttribute("data-category");
                if (target === "all" || cat === target) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });

    // Save Store Profile
    document.getElementById("btn-save-store-settings")?.addEventListener("click", async () => {
        const store_name = document.getElementById("setting-store-name")?.value.trim() || "Indrita Fabrics";
        const tagline = document.getElementById("setting-store-tagline")?.value.trim() || "Tradition in Every Drape";
        const phone = document.getElementById("setting-store-phone")?.value.trim() || "";
        const gst_number = document.getElementById("setting-store-gst")?.value.trim().toUpperCase() || "";
        const address = document.getElementById("setting-store-address")?.value.trim() || "";
        const default_gst_rate = Number(document.getElementById("setting-default-gst")?.value || 18);

        try {
            const res = await fetch("/api/billing/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    store_name,
                    tagline,
                    phone,
                    gst_number,
                    address,
                    default_gst_rate,
                    printer_model: "DEV 2IN1 632-L58P",
                    printer_paper_width: 58,
                    printer_dpi: 203
                })
            });

            if (res.ok) {
                const updated = await res.json();
                state.storeSettings = { ...state.storeSettings, ...updated };
                updateHeaderBranding();
                updateReceiptLivePreview();
                window.showToast("Store profile updated successfully!");
            }
        } catch (e) {
            console.error("Save settings error:", e);
            window.showToast("Failed to save settings");
        }
    });

    // Hardware Pair & Config from Settings Screen
    document.getElementById("btn-more-pair-printer")?.addEventListener("click", connectWebBluetoothPrinter);
    document.getElementById("btn-open-printer-modal-from-settings")?.addEventListener("click", openPrinterSettingsModal);

    // Test Audio Chime
    document.getElementById("btn-test-beep-audio")?.addEventListener("click", () => {
        playBeep();
        window.showToast("Played barcode scanner chime 🔔");
    });

    // Test Receipt Print
    document.getElementById("btn-test-receipt-print")?.addEventListener("click", async () => {
        const testInvoice = {
            id: "TEST-" + Math.floor(1000 + Math.random() * 9000),
            customer_name: "Walk-in Guest",
            customer_phone: "9876543210",
            payment_mode: "CASH",
            created_at: new Date().toISOString(),
            items: [
                { name: "Sample Banarasi Silk Saree", price: 8950, quantity: 1, gst_rate: 18 },
                { name: "Sample Cotton Kurti", price: 1200, quantity: 2, gst_rate: 5 }
            ],
            subtotal: 11350,
            discount_amount: 0,
            gst_amount: 1731,
            final_total: 11350
        };

        try {
            window.showToast("Sending test receipt to 58mm printer...");
            const receiptBytes = build58mmEscPosReceipt(testInvoice, state.storeSettings);
            if (state.printer.isConnected) {
                await sendRawBytesToPrinter(receiptBytes);
                window.showToast("Test receipt printed successfully!");
            } else {
                print58mmThermalReceiptFallback(testInvoice);
            }
        } catch (err) {
            console.error("Test print error:", err);
            print58mmThermalReceiptFallback(testInvoice);
        }
    });

    // Test Label Print
    document.getElementById("btn-test-label-print")?.addEventListener("click", async () => {
        const testProduct = {
            id: 99999,
            name: "Test",
            sku: "IF001",
            barcode: "IF001",
            category: "Sarees",
            price: 9900
        };

        try {
            await executePrint50x25mmLabelDirect(testProduct, 1);
        } catch (err) {
            console.error("Test label error:", err);
            openBarcodeLabelModal(testProduct);
        }
    });

    // System Diagnostics check
    const diagBluetooth = document.getElementById("diag-bluetooth-status");
    if (diagBluetooth) {
        if (navigator.bluetooth) {
            diagBluetooth.textContent = "Supported (Web BLE Ready)";
            diagBluetooth.style.color = "#059669";
        } else {
            diagBluetooth.textContent = "Unavailable (Use Chrome/Edge)";
            diagBluetooth.style.color = "#DC2626";
        }
    }

    // Executive A4 PDF Document Exports
    document.getElementById("btn-export-invoices-pdf")?.addEventListener("click", () => {
        window.open("/api/billing/export/invoices-pdf", "_blank");
    });

    document.getElementById("btn-export-products-pdf")?.addEventListener("click", () => {
        window.open("/api/billing/export/products-pdf", "_blank");
    });

    // Clear Invoices
    document.getElementById("btn-clear-invoices-data")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to clear all invoice history? This cannot be undone.")) return;
        try {
            const res = await fetch("/api/billing/clear-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target: "invoices" })
            });
            if (res.ok) {
                window.showToast("Invoice history cleared");
                await loadReportsData();
            }
        } catch (e) {
            window.showToast("Failed to clear invoices");
        }
    });

    // Clear Products
    document.getElementById("btn-clear-products-data")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete all products from POS catalog?")) return;
        try {
            const res = await fetch("/api/billing/clear-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target: "products" })
            });
            if (res.ok) {
                state.products = [];
                state.filteredProducts = [];
                renderCatalog();
                window.showToast("POS catalog cleared");
            }
        } catch (e) {
            window.showToast("Failed to clear products");
        }
    });
}

