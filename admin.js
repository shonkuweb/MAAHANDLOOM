// Mock Data
const products = [
    { id: 'P001', name: 'Product Name 1', image: '', qty: 10 },
    { id: 'P002', name: 'Product Name 2', image: '', qty: 5 },
    { id: 'P003', name: 'Product Name 3', image: '', qty: 0 },
];

const orders = [
    { id: 'ORD-001', name: 'Customer A', image: '', qty: 2, status: 'new' },
    { id: 'ORD-002', name: 'Customer B', image: '', qty: 1, status: 'in-process' },
    { id: 'ORD-003', name: 'Customer C', image: '', qty: 5, status: 'completed' },
    { id: 'ORD-004', name: 'Customer D', image: '', qty: 1, status: 'new' },
];

// State
let currentView = 'products'; // 'products' or 'orders'
let currentFilter = 'new'; // 'new', 'in-process', 'completed' (only applies to orders)

// Elements
const viewToggle = document.getElementById('view-toggle');
const productsBtn = document.getElementById('btn-products');
const ordersBtn = document.getElementById('btn-orders');
const filterSection = document.getElementById('admin-filters');
const listContainer = document.getElementById('admin-list');
const filterBtns = document.querySelectorAll('.filter-chip');

// Initialize
function init() {
    render();
    setupListeners();
}

function setupListeners() {
    productsBtn.addEventListener('click', () => switchView('products'));
    ordersBtn.addEventListener('click', () => switchView('orders'));

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            updateFilterUI();
            render();
        });
    });
}

function switchView(view) {
    currentView = view;

    // Update Toggle UI
    if (view === 'products') {
        productsBtn.classList.add('active');
        ordersBtn.classList.remove('active');
        filterSection.style.display = 'none'; // No filters for products in this wireframe
    } else {
        productsBtn.classList.remove('active');
        ordersBtn.classList.add('active');
        filterSection.style.display = 'flex';
    }

    render();
}

function updateFilterUI() {
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === currentFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function render() {
    listContainer.innerHTML = '';

    let itemsToRender = [];

    if (currentView === 'products') {
        itemsToRender = products;
    } else {
        itemsToRender = orders.filter(o => o.status === currentFilter);
    }

    itemsToRender.forEach(item => {
        const el = document.createElement('div');
        el.className = 'admin-list-item';
        el.innerHTML = `
      <div class="admin-item-image">
        <span class="text-xs text-red">#IMAGE</span>
      </div>
      <div class="admin-item-details">
        <p><strong>${currentView === 'products' ? 'PRODUCT ID' : 'ORDER ID'} :</strong> ${item.id}</p>
        <p><strong>NAME :</strong> ${item.name}</p>
        <p><strong>QTY :</strong> ${item.qty}</p>
      </div>
      <div class="view-btn-container">
        <button class="view-btn">VIEW</button>
      </div>
    `;
        listContainer.appendChild(el);
    });

    if (itemsToRender.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">No items found.</p>';
    }
}

// Run
init();
