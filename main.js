import './style.css'

// Sidebar Logic
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

function closeAllMenus() {
  sidebar.classList.remove('active');
  const cartSidebar = document.getElementById('cart-sidebar');
  if (cartSidebar) cartSidebar.classList.remove('active');
  overlay.classList.remove('active');
}

function toggleSidebar() {
  // If cart is open, close it first
  const cartSidebar = document.getElementById('cart-sidebar');
  if (cartSidebar && cartSidebar.classList.contains('active')) {
    cartSidebar.classList.remove('active');
  }

  const isActive = sidebar.classList.toggle('active');
  overlay.classList.toggle('active', isActive);
}

menuBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', closeAllMenus);
overlay.addEventListener('click', closeAllMenus);

// Mock Product Data
// Product Data Logic
// Try to load from localStorage, otherwise fallback to defaults
let products = JSON.parse(localStorage.getItem('products')) || [
  // Default empty as per requirement
];

// If we used fallback defaults and nothing was in storage, we could opt to *not* save them 
// to avoid overwriting what Admin might Init, but Admin Init handles "if empty".
// Ideally, Admin is the source of truth. Main.js just reads.

// Context: Render Products into Grid
const grid = document.getElementById('product-grid');

// Filter State
let filterState = {
  sortPrice: 'default',
  categories: [],
  stockOnly: false
};

function getCategory(p) {
  // Infer category or default
  return p.category || 'Uncategorized';
}

function getPrice(p) {
  const str = String(p.price || 0).replace(/[^0-9.]/g, '');
  return parseFloat(str) || 0;
}

function renderProductGrid() {
  if (!grid) return;
  grid.innerHTML = '';

  let displayProducts = products.filter(p => {
    // 1. Availability
    if (filterState.stockOnly && (p.qty || 0) <= 0) return false;

    // 2. Categories
    if (filterState.categories.length > 0) {
      const cat = getCategory(p);
      if (!filterState.categories.includes(cat)) return false;
    }

    return true;
  });

  // 3. Sorting
  if (filterState.sortPrice === 'lowHigh') {
    displayProducts.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (filterState.sortPrice === 'highLow') {
    displayProducts.sort((a, b) => getPrice(b) - getPrice(a));
  }

  if (displayProducts.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No products found.</p>';
  } else {
    displayProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      let imageContent = `<div style="width: 80px; height: 80px; background-color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold;">${product.id}</div>`;

      if (product.image) {
        imageContent = `<img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover;">`;
      }

      // Ensure Price Display is Consistent
      const rawPrice = getPrice(product);

      card.innerHTML = `
          <div class="product-image-placeholder view-details-btn" data-id="${product.id}" style="cursor: pointer;">
             ${imageContent}
          </div>
          <div class="product-info">
            <h3>${product.name}</h3>
            <div class="product-row">
                <span class="product-price">₹${rawPrice}</span>
                <button class="add-cart-pill" data-id="${product.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    ADD CART
                </button>
            </div>
          </div>
        `;
      grid.appendChild(card);
    });
  }
}

// Initial Render
renderProductGrid();

// Grid Event Delegation
if (grid) {
  grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-details-btn')) {
      const id = e.target.dataset.id;
      window.location.href = `product_details.html?id=${id}`;
    }
  });
}

// Filter Logic Initialization
function initFilters() {
  const filterBtn = document.querySelector('.filter-btn');
  const modal = document.getElementById('filter-modal');
  const closeBtn = document.getElementById('close-filter');
  const applyBtn = document.getElementById('apply-filter');
  const resetBtn = document.getElementById('reset-filter');
  const catContainer = document.getElementById('filter-categories');

  if (!filterBtn || !modal) return;

  // Open Modal
  filterBtn.addEventListener('click', () => {
    // Populate Categories (Dynamic)
    if (catContainer) {
      const allCats = [...new Set(products.map(p => getCategory(p)))];
      catContainer.innerHTML = allCats.map(cat => `
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" value="${cat}" ${filterState.categories.includes(cat) ? 'checked' : ''}>
                    ${cat}
                </label>
            `).join('');
    }

    // Sync Sort Radio
    const radios = document.getElementsByName('sortPrice');
    radios.forEach(r => {
      r.checked = (r.value === filterState.sortPrice);
    });

    // Sync Stock Checkbox
    const stockChk = document.getElementById('filter-stock');
    if (stockChk) stockChk.checked = filterState.stockOnly;

    modal.classList.add('active');
  });

  // Close Modal
  const closeModal = () => modal.classList.remove('active');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Apply
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      // Read Sort
      const selectedSort = document.querySelector('input[name="sortPrice"]:checked');
      filterState.sortPrice = selectedSort ? selectedSort.value : 'default';

      // Read Categories
      const checkedCats = Array.from(catContainer.querySelectorAll('input:checked')).map(cb => cb.value);
      filterState.categories = checkedCats;

      // Read Stock
      const stockChk = document.getElementById('filter-stock');
      filterState.stockOnly = stockChk ? stockChk.checked : false;

      renderProductGrid();
      closeModal();
    });
  }

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      filterState = {
        sortPrice: 'default',
        categories: [],
        stockOnly: false
      };
      renderProductGrid();
      closeModal();
    });
  }
}

initFilters();

// Context: Category Page Logic
const categoryGrid = document.getElementById('category-grid');
const selectedCatTitle = document.getElementById('selected-cat-title');

if (categoryGrid) {
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('cat');

  if (catParam) {
    if (selectedCatTitle) selectedCatTitle.textContent = catParam;

    const catProducts = products.filter(p => {
      // Exact match on category field or loose match for legacy/imported data
      return (p.category === catParam) || (p.category && p.category.includes(catParam));
    });

    if (catProducts.length === 0) {
      categoryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">No products found in this category.</p>';
    } else {
      categoryGrid.innerHTML = ''; // Clear previous
      catProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        let imageContent = product.image
          ? `<img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover;">`
          : `<div style="width: 100%; height: 100%; background-color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold;">${product.id}</div>`;

        const rawPrice = getPrice(product.price);

        card.innerHTML = `
                  <div class="product-image-placeholder view-details-btn" data-id="${product.id}" style="cursor: pointer;">
                     ${imageContent}
                  </div>
                  <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-row">
                        <span class="product-price">₹${rawPrice}</span>
                        <button class="add-cart-pill" data-id="${product.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            ADD CART
                        </button>
                    </div>
                  </div>
                `;
        categoryGrid.appendChild(card);
      });

      // Event Delegation for this grid
      categoryGrid.addEventListener('click', (e) => {
        // Handle View Details
        if (e.target.classList.contains('view-details-btn') || e.target.closest('.view-details-btn')) {
          const target = e.target.classList.contains('view-details-btn') ? e.target : e.target.closest('.view-details-btn');
          const id = target.dataset.id;
          window.location.href = `product_details.html?id=${id}`;
        }
        // Handle Add to Cart (since we added buttons here too)
        if (e.target.closest('.add-cart-pill')) {
          const btn = e.target.closest('.add-cart-pill');
          const id = btn.dataset.id;
          addToCart(id);
        }
      });
    }
  } else {
    // If no category selected, maybe show all or hide
    if (selectedCatTitle) selectedCatTitle.textContent = 'SELECT A CATEGORY ABOVE';
    categoryGrid.innerHTML = '';
  }
}
// Context: Render Product Details (Detail Page)
const detailContainer = document.getElementById('product-detail-container');
if (detailContainer) {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const product = products.find(p => p.id == productId);

  if (product) {
    // Prepare Images
    let images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
    // Fallback for placeholder
    if (images.length === 0) images = [null];

    let currentSlide = 0;

    // HTML Structure
    detailContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; min-height: 80vh;">
            <div class="detail-image-container" id="detail-slider">
                <!-- Images injected here -->
                <div class="pagination-dots" id="dots-container"></div>
            </div>
            
            <div class="detail-title">${product.name}</div>
            <div class="detail-desc">${product.description || 'No description available'}</div>
            <div class="detail-price">₹${product.price}</div>
            
            <div class="action-buttons">
                <button id="add-to-cart-detail-btn" class="btn-add-cart-large">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    ADD TO CART
                </button>
                <button id="buy-now-btn" class="btn-buy-now-large">BUY NOW</button>
            </div>
        </div>
        `;

    // Render Slider
    const sliderContainer = document.getElementById('detail-slider');
    const dotsContainer = document.getElementById('dots-container');

    // Function to render slide
    function showSlide(index) {
      currentSlide = index;
      // Clear existing images (except dots which are absolute) - actually easier to rebuild
      // Let's just set the background or img tag of the container
      // Better: Create img element
      const existingImg = sliderContainer.querySelector('img') || sliderContainer.querySelector('.detail-img-placeholder');
      if (existingImg) existingImg.remove();

      const imgSrc = images[currentSlide];
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 16px;';
        sliderContainer.insertBefore(img, dotsContainer);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'detail-img-placeholder';
        placeholder.textContent = product.id;
        placeholder.style.cssText = 'width: 100%; height: 100%; background: #ccc; display:flex; align-items:center; justify-content:center; border-radius:16px;';
        sliderContainer.insertBefore(placeholder, dotsContainer);
      }

      // Update Dots
      dotsContainer.innerHTML = '';
      if (images.length > 1) {
        images.forEach((_, idx) => {
          const dot = document.createElement('div');
          dot.className = `dot ${idx === currentSlide ? 'active' : ''}`;
          dot.onclick = () => showSlide(idx);
          dotsContainer.appendChild(dot);
        });
      }
    }

    // Init Slide
    showSlide(0);

    // Events
    document.getElementById('add-to-cart-detail-btn').addEventListener('click', () => {
      addToCart(product.id);
    });

    document.getElementById('buy-now-btn').addEventListener('click', () => {
      addToCart(product.id);
      window.location.href = 'checkout.html';
    });

  } else {
    detailContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">Product not found.</p>';
  }
}
// Footer Injection
function injectFooter() {
  // Don't inject on Admin Panel if not desired, but user didn't specify exclusion. 
  // Let's assume global footer for now.

  if (document.querySelector('footer')) return; // Prevent duplicate
  if (window.location.pathname.includes('admin.html')) return; // No footer on admin

  const footer = document.createElement('footer');
  footer.innerHTML = `
    <div class="footer-links">
      <a href="#" class="footer-link">terms & condition</a>
      <a href="#" class="footer-link">contact no.</a>
      <a href="#" class="footer-link">location by maps</a>
    </div>
    <div class="social-icons">
      <a href="#" class="social-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
      </a>
      <a href="#" class="social-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
      </a>
      <a href="#" class="social-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
      </a>
    </div>
    <div class="copyright">
      Maa Handloom. All rights reserved.
    </div>
  `;
  document.body.appendChild(footer);
}

// Initialize Cart
// Cart State
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productId) {
  const product = products.find(p => p.id == productId); // Use == for loose comparison as IDs might be string/number
  if (!product) return;

  // Check stock
  if (product.qty <= 0) {
    alert('Out of stock!');
    return;
  }

  const existing = cart.find(item => item.id == productId);
  if (existing) {
    if (existing.qty < product.qty) {
      existing.qty++;
    } else {
      alert('Max quantity reached');
    }
  } else {
    cart.push({ ...product, qty: 1, maxQty: product.qty });
  }
  saveCart();
  renderCartItems();
  openCart();
}

function openCart() {
  const cartSidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('overlay');
  if (cartSidebar) cartSidebar.classList.add('active');
  if (overlay) overlay.classList.add('active');
}

function injectCart() {
  if (document.getElementById('cart-sidebar')) return;

  const cartHTML = `
    <aside id="cart-sidebar" class="cart-sidebar">
      <div class="cart-header">
        <button id="cart-close-btn" class="cart-close-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        CART
        <svg style="margin-left: 0.5rem;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
      </div>
      <div class="cart-items">
        <!-- Rendered via JS -->
      </div>
      <div class="cart-footer" style="padding: 1rem; border-top: 1px solid #ddd;">
        <button id="checkout-btn" class="btn-buy-now-large" style="width: 100%;">CHECKOUT</button>
      </div>
    </aside>
  `;
  document.body.insertAdjacentHTML('beforeend', cartHTML);

  renderCartItems();

  // Logic
  const cartBtn = document.getElementById('cart-btn');
  const cartSidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('overlay');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      cartSidebar.classList.toggle('active');
      overlay.classList.toggle('active');
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  }

  const cartCloseBtn = document.getElementById('cart-close-btn');
  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', closeAllMenus);
  }

  // Close on overlay click listener is handled globally
  overlay.addEventListener('click', () => {
    if (cartSidebar.classList.contains('active')) {
      cartSidebar.classList.remove('active');
    }
  });

  // Checkout Listener
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkout);
  }
}

function renderCartItems() {
  const container = document.querySelector('.cart-items');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:1rem;">Cart is empty</p>';
    return;
  }

  const html = cart.map(item => {
    // Look up latest product info
    const product = products.find(p => p.id == item.id);

    // If product deleted, we might want to flag it or handle gracefully. 
    // For now, use item data as fallback but prefer product data.
    const displayItem = product || item;

    // Ensure we handle image display correctly (base64 or placeholder)
    let imgHtml = displayItem.image
      ? `<img src="${displayItem.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
      : `<span class="text-red" style="font-size: 0.5rem; display: flex; justify-content: center; align-items: center; height: 100%;">#IMAGE</span>`;

    // Check if we have valid price/stock info, otherwise fallback (fixes UNDEFINED)
    const price = displayItem.price || '0';
    const stock = displayItem.qty !== undefined ? displayItem.qty : (displayItem.maxQty || 100);

    return `
          <div class="cart-item">
            <div class="cart-item-img">
                ${imgHtml}
            </div>
            <div class="cart-item-details">
              <span class="cart-item-title">${displayItem.name}</span>
              <span class="cart-item-text">PRICE : ${price}</span>
              <span class="cart-item-text">STOCK : ${stock}</span>
            </div>
            <div class="qty-selector">
              <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
            </div>
          </div>
        `;
  }).join('');

  container.innerHTML = html;
}

// Global scope for onclick handlers in HTML string
window.updateCartQty = function (id, change) {
  const item = cart.find(i => i.id == id); // Use == for loose comparison
  if (!item) return;

  const product = products.find(p => p.id == id) || item;

  const newQty = item.qty + change;
  if (newQty < 1) {
    // Remove item
    cart = cart.filter(i => i.id != id); // Use != for loose comparison
  } else if (newQty > (product.qty || 100)) {
    // Use product.qty for check
    alert('Max stock reached');
    return;
  } else {
    item.qty = newQty;
  }
  saveCart();
  renderCartItems();
};


function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  // Redirect to checkout page
  window.location.href = 'checkout.html';
}

// Checkout Page Logic
// Checkout Page Logic
function initCheckoutPage() {
  try {
    const list = document.getElementById('checkout-items');
    const form = document.getElementById('checkout-form');

    if (!list) console.error('Element #checkout-items not found');
    if (!form) console.error('Element #checkout-form not found');

    if (list && form) {
      if (!Array.isArray(cart) || cart.length === 0) {
        // Only alert if we think we should be here (user might just be browsing)
        // But for checkout page, empty cart redirect is valid
        alert('Cart is empty. Redirecting to home.');
        window.location.href = 'index.html';
        return;
      }

      // Helper to parse price
      const getPrice = (p) => {
        if (p === undefined || p === null) return 0;
        if (typeof p === 'number') return p;
        const str = String(p).replace(/[^0-9.]/g, '');
        const val = parseFloat(str);
        if (isNaN(val)) return 0;
        return val;
      };

      // Render Items
      console.log('Cart Items for Checkout:', cart);

      const total = cart.reduce((acc, item) => {
        const price = getPrice(item.price);
        return acc + (price * item.qty);
      }, 0);

      list.innerHTML = cart.map(item => {
        const product = products.find(p => p.id == item.id) || item;
        const itemPrice = getPrice(product.price);
        return `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; gap:0.5rem; align-items:center;">
                      <span style="font-weight:bold; font-size:0.8rem; background:#fff; padding:2px 6px; border-radius:4px;">x${item.qty}</span>
                      <span style="font-size:0.9rem; font-weight:600;">${product.name || 'Unknown Item'}</span>
                  </div>
                  <span style="font-weight:bold;">₹${itemPrice * item.qty}</span>
              </div>
          `;
      }).join('');

      console.log('Calculated Total:', total);

      const totalEl = document.getElementById('checkout-total');
      const btnTotalEl = document.getElementById('btn-total');

      if (totalEl) totalEl.textContent = '₹' + total;
      else console.error('Element #checkout-total not found');

      if (btnTotalEl) btnTotalEl.textContent = '₹' + total;
      else console.error('Element #btn-total not found');

      // Handle Submit Logic (Simulation)
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Safe Element Access
        const safeVal = (id) => document.getElementById(id) ? document.getElementById(id).value : '';

        const name = safeVal('name');
        const phone = safeVal('phone');
        const address = safeVal('address');
        const city = safeVal('city');
        const zip = safeVal('zip');

        // Show Processing Overlay
        const processingOverlay = document.getElementById('processing-overlay');
        if (processingOverlay) processingOverlay.style.display = 'flex';

        // Simulate Payment Delay
        setTimeout(() => {
          // Create Order
          const orderId = 'ORD-' + String(Date.now()).slice(-6);
          const order = {
            id: orderId,
            name: name,
            phone: phone,
            address: `${address}, ${city} - ${zip}`,
            qty: cart.reduce((acc, item) => acc + item.qty, 0),
            total: total,
            status: 'new',
            items: cart
          };

          // Save Order
          let currentOrders = [];
          try {
            currentOrders = JSON.parse(localStorage.getItem('orders')) || [];
          } catch (err) {
            currentOrders = [];
          }
          currentOrders.unshift(order);
          localStorage.setItem('orders', JSON.stringify(currentOrders));

          // Update Stock
          let allProducts = [];
          try {
            allProducts = JSON.parse(localStorage.getItem('products')) || [];
          } catch (err) {
            console.error("Product parse error during checkout", err);
          }

          cart.forEach(cartItem => {
            const productIndex = allProducts.findIndex(p => p.id == cartItem.id);
            if (productIndex !== -1) {
              allProducts[productIndex].qty -= cartItem.qty;
              if (allProducts[productIndex].qty < 0) allProducts[productIndex].qty = 0;
            }
          });
          localStorage.setItem('products', JSON.stringify(allProducts));

          // Clear Cart
          cart = [];
          saveCart();

          // Check for success modal elements
          if (processingOverlay) processingOverlay.style.display = 'none';

          const successModal = document.getElementById('success-modal');
          const orderIdSpan = document.getElementById('success-order-id');
          const continueBtn = document.getElementById('success-continue-btn');

          if (successModal) {
            if (orderIdSpan) orderIdSpan.textContent = orderId;
            successModal.style.display = 'flex';

            if (continueBtn) {
              continueBtn.onclick = () => {
                window.location.href = 'index.html';
              }
            }
          } else {
            // Fallback if modal missing
            alert(`Order Placed Successfully! Order ID: ${orderId}`);
            window.location.href = 'index.html';
          }

        }, 3000); // 3 Seconds Delay
      });
    } else {
      alert("CRITICAL ERROR: Checkout form elements not found. Please refresh.");
    }
  } catch (error) {
    alert("Javascript Error in Checkout: " + error.message);
    console.error(error);
  }
}

// Tracking Page Logic (New Premium Timeline)
function initTrackingPage() {
  const trackBtn = document.getElementById('track-btn');
  const input = document.getElementById('track-id');
  const resultContainer = document.getElementById('tracking-result');

  if (!trackBtn || !input) return;

  // Helper to Set Timeline State
  function setTimeline(stepIndex) {
    // Steps 1 to 4
    const steps = [1, 2, 3, 4];

    steps.forEach(i => {
      const stepEl = document.getElementById(`step-${i}`);
      const lineEl = document.getElementById(`line-${i - 1}`); // Line before step

      if (i <= stepIndex) {
        stepEl.classList.add('active');
        if (lineEl) lineEl.classList.add('active');
      } else {
        stepEl.classList.remove('active');
        if (lineEl) lineEl.classList.remove('active');
      }
    });
  }

  function searchOrder() {
    const id = input.value.trim();
    if (!id) {
      alert('Please enter an Order ID');
      return;
    }

    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const order = orders.find(o => o.id === id);

    if (order) {
      // Show Result
      resultContainer.style.display = 'block';

      // Fill Details
      document.getElementById('display-order-id').textContent = '#' + order.id;
      document.getElementById('display-status').textContent = order.status;
      document.getElementById('display-total').textContent = '₹' + order.total;
      // Use current date if not saved, mostly for demo
      document.getElementById('display-date').textContent = new Date().toLocaleDateString();

      // Map Status to Steps
      // new -> 1 (Placed)
      // in-process -> 2 (Processing)
      // completed -> 4 (Delivered) - Skipping 3 for simple mapping or map randomly

      let step = 1;
      if (order.status === 'in-process') step = 2;
      if (order.status === 'completed') step = 4;

      // Animate Steps
      // Reset first
      setTimeline(0);

      // Progressive Animation
      let current = 1;
      const interval = setInterval(() => {
        setTimeline(current);
        if (current >= step) clearInterval(interval);
        current++;
      }, 500); // 0.5s delay per step for effect

    } else {
      alert('Order not found. Please check the ID.');
      resultContainer.style.display = 'none';
    }
  }

  trackBtn.addEventListener('click', searchOrder);
}

// Init
if (window.location.pathname.includes('track-order.html')) {
  initTrackingPage();
}
// Update Add to Cart Buttons to use new logic
document.addEventListener('click', (e) => {
  // Main Grid Add Button (looks for .add-cart-pill)
  if (e.target.closest('.add-cart-pill')) {
    const btn = e.target.closest('.add-cart-pill');
    const id = btn.dataset.id;
    addToCart(id);
  }
  // Detail Page Add Button
  if (e.target.id === 'add-to-cart-detail-btn') {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    addToCart(id);
  }
});

// Run Init
if (window.location.pathname.includes('checkout.html')) {
  initCheckoutPage();
} else {
  injectCart();
}

// Update existing products to have default stock if missing
products = products.map(p => ({
  ...p,
  qty: p.qty !== undefined ? p.qty : 100
}));
localStorage.setItem('products', JSON.stringify(products));

