import './style.css'

// Sidebar Logic
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

function toggleSidebar() {
  const isActive = sidebar.classList.toggle('active');
  overlay.classList.toggle('active', isActive);
}

menuBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Mock Product Data
const products = [
  { id: 1, name: '#product description', price: '#xxx' },
  { id: 2, name: '#product description', price: '#xxx' },
  { id: 3, name: '#product description', price: '#xxx' },
  { id: 4, name: '#product description', price: '#xxx' },
];

// Context: Render Products into Grid
const grid = document.getElementById('product-grid');

if (grid) {
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image-placeholder">
         <span class="text-red">#product image</span>
      </div>
      <div class="cart-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.price}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}
// Footer Injection
function injectFooter() {
  // Don't inject on Admin Panel if not desired, but user didn't specify exclusion. 
  // Let's assume global footer for now.

  if (document.querySelector('footer')) return; // Prevent duplicate

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

// Initialize
injectFooter();
