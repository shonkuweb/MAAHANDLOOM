import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

const Navbar = ({ onMenuClick, onCartClick }) => {
    const { cart, products, searchQuery, setSearchQuery } = useShop();
    const [searchOpen, setSearchOpen] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef(null);

    const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

    // Filter products based on search query
    const searchResults = searchQuery && searchQuery.trim().length >= 1
        ? products.filter(p => {
            const query = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query)) ||
                (p.category && p.category.toLowerCase().includes(query));
        }).slice(0, 8)
        : [];

    const handleClose = () => {
        setSearchOpen(false);
        setSearchQuery('');
    };

    const handleProductClick = (id) => {
        handleClose();
        navigate(`/product/${id}`);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                handleClose();
            }
        };
        if (searchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchOpen]);

    return (
        <nav className="navbar">
            <button id="menu-btn" className="nav-icon" onClick={onMenuClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>Indrita Fabrics</Link>

            {/* Search Bar (Mobile Toggle) */}
            {searchOpen && (
                <div className="search-bar-container" ref={searchRef} style={{ display: 'flex' }}>
                    <div className="search-input-wrapper pill-search">
                        <span className="pill-icon-left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input
                            type="text"
                            id="navbar-search-input"
                            placeholder="Search products..."
                            autoComplete="off"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="pill-icon-right" onClick={handleClose}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            borderRadius: '0 0 12px 12px',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            zIndex: 200,
                        }}>
                            {searchResults.map(p => {
                                const imgSrc = (p.images && p.images.length) ? p.images[0] : p.image;
                                return (
                                    <div key={p.id} onClick={() => handleProductClick(p.id)} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f0f0f0',
                                        transition: 'background 0.15s',
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        {imgSrc ? (
                                            <img src={imgSrc} alt={p.name} style={{
                                                width: '48px', height: '48px', objectFit: 'cover',
                                                borderRadius: '8px', flexShrink: 0
                                            }} />
                                        ) : (
                                            <div style={{
                                                width: '48px', height: '48px', background: '#f3f4f6',
                                                borderRadius: '8px', flexShrink: 0, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.6rem', color: '#999'
                                            }}>IMG</div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 700, fontSize: '0.85rem', color: '#2C1B10',
                                                textTransform: 'uppercase', overflow: 'hidden',
                                                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>{p.name}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#666' }}>
                                                ₹{typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {searchQuery && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            borderRadius: '0 0 12px 12px',
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#999',
                            fontSize: '0.9rem',
                            zIndex: 200,
                        }}>
                            No products found.
                        </div>
                    )}
                </div>
            )}

            <div className="nav-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                <button id="search-toggle" className="nav-icon" onClick={() => setSearchOpen(!searchOpen)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>

                <button id="cart-btn" className="nav-icon" onClick={onCartClick} style={{ position: 'relative' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    {cartCount > 0 && <span className="cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
