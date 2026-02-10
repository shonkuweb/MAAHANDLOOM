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

// Policy Pages
import About from './pages/About';
import Contact from './pages/Contact';
import Refund from './pages/Refund';
import TrackOrder from './pages/TrackOrder';
import TermsAndConditions from './pages/TermsAndConditions';
import ReturnPolicy from './pages/ReturnPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import WhatsAppButton from './components/WhatsAppButton';



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
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track-order" element={<TrackOrder />} />
                {/* Admin is handled by server */}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/return-policy" element={<ReturnPolicy />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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
