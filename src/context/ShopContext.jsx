import { createContext, useState, useEffect, useContext } from 'react';

const ShopContext = createContext();

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('cart') || '[]');
        } catch {
            return [];
        }
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const addToCart = (productId, selectedColor = null) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const stockToCheck = selectedColor ? selectedColor.qty : product.qty;
        if (stockToCheck <= 0) {
            alert('Out of stock for selected option');
            return;
        }

        const cartItemId = selectedColor ? `${productId}-${selectedColor.colorName}` : productId;

        setCart(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) {
                if (existing.qty + 1 > stockToCheck) {
                    alert('Cannot add more of this item, stock limit reached.');
                    return prev;
                }
                return prev.map(item =>
                    item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item
                );
            }
            return [...prev, {
                cartItemId,
                id: productId,
                qty: 1,
                color: selectedColor ? { name: selectedColor.colorName, hex: selectedColor.colorHex } : null
            }];
        });
    };

    const removeFromCart = (cartItemId) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQty = (cartItemId, newQty) => {
        if (newQty < 1) {
            removeFromCart(cartItemId);
            return;
        }
        setCart(prev => prev.map(item =>
            item.cartItemId === cartItemId ? { ...item, qty: newQty } : item
        ));
    };

    const clearCart = () => setCart([]);

    const getCartTotal = () => {
        return cart.reduce((acc, item) => {
            const product = products.find(p => p.id === item.id);
            // Handle cost if product missing or price formatting
            const price = product ? (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0) : 0;
            return acc + (price * item.qty);
        }, 0);
    };

    const value = {
        products,
        cart,
        searchQuery,
        setSearchQuery,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        getCartTotal,
        fetchProducts
    };

    return (
        <ShopContext.Provider value={value}>
            {children}
        </ShopContext.Provider>
    );
};
