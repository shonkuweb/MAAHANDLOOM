import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import ProductCard from '../components/ProductCard';

const CategoryPage = () => {
    const { slug } = useParams();
    const { products } = useShop();
    const [filteredProducts, setFilteredProducts] = useState([]);

    // Map slugs to category names
    const categoryMap = {
        'surat-silk': 'Surat Silk Special',
        'handloom': 'Handloom Special',
        'shantipuri': 'Shantipuri Special'
    };

    const categoryName = categoryMap[slug] || slug;

    useEffect(() => {
        if (products && categoryName) {
            const filtered = products.filter(p => p.category === categoryName);
            setFilteredProducts(filtered);
        }
    }, [products, categoryName]);

    return (
        <main style={{ padding: '2rem 1rem', minHeight: '60vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{
                    fontFamily: 'Great Vibes, cursive',
                    fontSize: '2.5rem',
                    textAlign: 'center',
                    marginBottom: '0.5rem',
                    color: '#2C1B10'
                }}>
                    {categoryName}
                </h1>

                <p style={{
                    textAlign: 'center',
                    color: '#666',
                    marginBottom: '2rem',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                </p>

                {filteredProducts.length > 0 ? (
                    <div className="product-grid">
                        {filteredProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: '#666'
                    }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                            No products found in this category yet.
                        </p>
                        <Link to="/" style={{
                            color: '#2C1B10',
                            textDecoration: 'underline',
                            fontWeight: '600'
                        }}>
                            Browse all products
                        </Link>
                    </div>
                )}
            </div>
        </main >
    );
};

export default CategoryPage;
