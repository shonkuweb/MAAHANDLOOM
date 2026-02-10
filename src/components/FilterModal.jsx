import React, { useState } from 'react';

const FilterModal = ({ isOpen, onClose, onApply, initialFilters }) => {
    const [sort, setSort] = useState(initialFilters?.sort || '');
    const [categories, setCategories] = useState(initialFilters?.categories || []);
    const [stock, setStock] = useState(initialFilters?.stock || 'all');

    // 3 categories only (no Cotton)
    const categoryOptions = [
        'Surat Silk Special',
        'Handloom Special',
        'Shantipuri Special'
    ];

    if (!isOpen) return null;

    const handleCategoryChange = (cat) => {
        if (categories.includes(cat)) {
            setCategories(categories.filter(c => c !== cat));
        } else {
            setCategories([...categories, cat]);
        }
    };

    const handleApply = () => {
        onApply({ sort, categories, stock });
        onClose();
    };

    const handleReset = () => {
        setSort('default');
        setStock(false);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '400px',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>FILTER & SORT</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Categories</h3>
                    {categoryOptions.map(cat => (
                        <label key={cat} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={categories.includes(cat)}
                                onChange={() => handleCategoryChange(cat)}
                                style={{ marginRight: '0.5rem', cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: '0.9rem' }}>{cat}</span>
                        </label>
                    ))}
                </div>

                {/* Sort */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sort By Price</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="radio" name="sortPrice" value="default" checked={sort === 'default'} onChange={() => setSort('default')} />
                            Default
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="radio" name="sortPrice" value="lowHigh" checked={sort === 'lowHigh'} onChange={() => setSort('lowHigh')} />
                            Price: Low to High
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="radio" name="sortPrice" value="highLow" checked={sort === 'highLow'} onChange={() => setSort('highLow')} />
                            Price: High to Low
                        </label>
                    </div>
                </div>



                {/* Stock */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Availability</h3>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={stock} onChange={e => setStock(e.target.checked)} />
                        In Stock Only
                    </label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleReset}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: '1px solid #ccc',
                            background: 'white',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        RESET
                    </button>
                    <button
                        onClick={handleApply}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#2C1B10',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        APPLY
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterModal;
