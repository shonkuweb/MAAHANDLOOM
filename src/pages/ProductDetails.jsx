import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { products, addToCart } = useShop();
    const [product, setProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedColor, setSelectedColor] = useState(null);

    useEffect(() => {
        if (products.length > 0) {
            const found = products.find(p => p.id === id);
            setProduct(found);
            if (found && found.colors && found.colors.length > 0) {
                setSelectedColor(found.colors[0]);
            } else {
                setSelectedColor(null);
            }
            setCurrentImageIndex(0);
        }
    }, [products, id]);

    if (!product) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Loading product details...</p>
                {products.length > 0 && <p>Product not found.</p>}
            </div>
        );
    }

    // Determine current images based on selected color or fallback to legacy
    const images = selectedColor && selectedColor.images.length > 0
        ? selectedColor.images
        : (product.images && product.images.length > 0
            ? product.images
            : (product.image ? [product.image] : []));

    // Determine current stock handling
    const currentQty = selectedColor ? selectedColor.qty : product.qty;

    const handleAddToCart = () => {
        // We will update cart logic next to handle passing selectedColor
        addToCart(product.id, selectedColor);
        alert('Added to cart!');
    };

    const handleBuyNow = () => {
        addToCart(product.id, selectedColor);
        navigate('/checkout');
    };

    return (
        <main style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div className="product-detail-container">
                {/* Image Gallery */}
                <div className="detail-image-container">
                    {images.length > 0 ? (
                        <img
                            src={images[currentImageIndex]}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>NO IMAGE</div>
                    )}
                </div>

                {/* Dots */}
                {images.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {images.map((_, idx) => (
                            <div
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: idx === currentImageIndex ? '#2C1B10' : '#ccc',
                                    cursor: 'pointer'
                                }}
                            ></div>
                        ))}
                    </div>
                )}

                {/* Info */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{product.name}</h1>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{product.price}</div>
                    </div>

                    <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        {product.description || 'No description available.'}
                    </p>
                </div>

                {/* Color Variants Area */}
                {product.colors && product.colors.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.75rem', color: '#666' }}>Available Colors</h3>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {product.colors.map((c, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setSelectedColor(c); setCurrentImageIndex(0); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '30px',
                                        border: `2px solid ${selectedColor?.colorName === c.colorName ? '#2C1B10' : '#EEE'}`,
                                        cursor: 'pointer',
                                        background: selectedColor?.colorName === c.colorName ? '#F9F7F4' : '#FFF',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.colorHex, border: '1px solid #CCC' }}></span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: selectedColor?.colorName === c.colorName ? '600' : '400', color: '#333' }}>{c.colorName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Additional Info */}
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#666' }}>Category</span>
                        <span style={{ fontWeight: 'bold' }}>{product.category || 'N/A'}</span>
                    </div>
                    {product.subcategory && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#666' }}>Subcategory</span>
                            <span style={{ fontWeight: 'bold' }}>{product.subcategory}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666' }}>Availability</span>
                        <span style={{ fontWeight: 'bold', color: currentQty > 0 ? '#2C1B10' : 'red' }}>
                            {currentQty > 0 ? `${currentQty} in Stock` : 'Out of Stock'}
                        </span>
                    </div>
                </div>

                {/* Sticky Action Bar */}
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    background: 'white',
                    padding: '1rem',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                    display: 'flex',
                    gap: '1rem',
                    zIndex: 100
                }}>
                    {product.qty <= 0 ? (
                        <button style={{ flex: 1, padding: '1rem', background: '#ccc', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'not-allowed' }} disabled>
                            OUT OF STOCK
                        </button>
                    ) : (
                        <>
                            <button onClick={handleAddToCart} style={{
                                flex: 1,
                                padding: '1rem',
                                background: '#f3f4f6',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                Add to Cart
                            </button>
                            <button onClick={handleBuyNow} style={{
                                flex: 1,
                                padding: '1rem',
                                background: '#2C1B10',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase'
                            }}>
                                Buy Now
                            </button>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
};

export default ProductDetails;
