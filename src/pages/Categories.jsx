import React from 'react';
import { Link } from 'react-router-dom';

const Categories = () => {
    return (
        <main style={{ padding: '1rem' }}>
            <h1 className="text-red" style={{ textAlign: 'center', marginBottom: '2rem' }}>CATEGORIES</h1>

            <div className="category-grid-page" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Link to="/category/surat-silk" className="cat-page-card">
                    <div className="cat-page-circle" style={{ overflow: 'hidden', border: '3px solid #DFC186' }}>
                        <img src="/categories/surat-silk.jpg" alt="Surat Silk"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="cat-page-label">Surat Silk<br />Special</div>
                </Link>

                <Link to="/category/handloom" className="cat-page-card">
                    <div className="cat-page-circle" style={{ overflow: 'hidden', border: '3px solid #DFC186' }}>
                        <img src="/categories/handloom-special.png" alt="Handloom Special"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="cat-page-label">Handloom<br />Special</div>
                </Link>

                <Link to="/category/shantipuri" className="cat-page-card">
                    <div className="cat-page-circle" style={{ overflow: 'hidden', border: '3px solid #DFC186' }}>
                        <img src="/categories/shantipuri-special.png" alt="Shantipuri Special"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="cat-page-label">Shantipuri<br />Special</div>
                </Link>
            </div>
        </main>
    );
};

export default Categories;
