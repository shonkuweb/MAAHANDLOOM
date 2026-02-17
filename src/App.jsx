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
import Categories from './pages/Categories';
import OrderConfirmation from './pages/OrderConfirmation';

// ... (existing imports)

// ...

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                {/* Admin is handled by server */}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/return-policy" element={<ReturnPolicy />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            </Routes>

            <WhatsAppButton />
{ showFooter && <Footer /> }
        </div >
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
