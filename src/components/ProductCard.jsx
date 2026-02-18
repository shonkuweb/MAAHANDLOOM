import React from 'react';
import { useShop } from '../context/ShopContext';
import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
    const { addToCart } = useShop();

    return (
        <div className="product-card">
            <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-image-placeholder">
                    {product.image ? (
                        <img src={product.image} alt={product.name} loading="lazy" />
                    ) : (
                        <div className="product-no-img">No Image</div>
                    )}
                </div>
            </Link>

            <div className="product-info">
                <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 className="product-name">{product.name}</h3>
                </Link>
                <div className="product-row">
                    <div className="product-price-wrap">
                        <span className="product-price">₹{product.price}</span>
                    </div>
                    <button className="add-cart-pill" onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart(product.id);
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        ADD
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
