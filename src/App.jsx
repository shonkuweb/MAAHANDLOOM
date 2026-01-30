import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ShopProvider } from './context/ShopContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CartSidebar from './components/CartSidebar';
import Footer from './components/Footer';
import Home from './pages/Home';

import ProductDetails from './pages/ProductDetails';
import CategoryPage from './pages/CategoryPage';
import Checkout from './pages/Checkout';

// Placeholder Pages
const PagePlaceholder = ({ title }) => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>{title}</h2>
        <p>Coming Soon...</p>
    </div>
);

const ScrollToTop = () => {
    const { pathname } = useLocation();
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

function AppContent() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const location = useLocation();

    // Determine if Footer should be hidden (e.g. Admin?)
    // Keeping it simple for now, show everywhere except maybe Checkout if desired.
    const showFooter = !location.pathname.includes('/admin');

    return (
        <div className="app-container">
            <ScrollToTop />
            <Navbar
                onMenuClick={() => setSidebarOpen(true)}
                onCartClick={() => setCartOpen(true)}
            />

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />

            {/* Overlay for sidebars */}
            {(sidebarOpen || cartOpen) && (
                <div
                    className="overlay active"
                    onClick={() => {
                        setSidebarOpen(false);
                        setCartOpen(false);
                    }}
                ></div>
            )}

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/categories" element={<PagePlaceholder title="Categories" />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track-order" element={<PagePlaceholder title="Track Order" />} />
                <Route path="/admin" element={<PagePlaceholder title="Admin Panel" />} />
                <Route path="/about" element={<PagePlaceholder title="About Us" />} />
                <Route path="/contact" element={<PagePlaceholder title="Contact Us" />} />
                <Route path="/refund" element={<PagePlaceholder title="Refund Policy" />} />
            </Routes>

            {showFooter && <Footer />}
        </div>
    );
}

const App = () => {
    return (
        <ShopProvider>
            <Router>
                <AppContent />
            </Router>
        </ShopProvider>
    );
};

export default App;
