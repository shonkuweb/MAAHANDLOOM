import React, { useState } from 'react';

const TrackOrder = () => {
    const [orderId, setOrderId] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleTrack = async () => {
        if (!orderId.trim()) {
            window.showToast?.('Please enter an Order ID', 'error');
            return;
        }
        setLoading(true);
        setError(null);
        setOrderData(null);
        try {
            const res = await fetch(`/api/orders/${orderId.trim()}`);
            if (!res.ok) throw new Error('Order not found');
            const data = await res.json();
            setOrderData(data);
        } catch (err) {
            setError('Order not found. Please check the ID and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleTrack();
    };

    const steps = [
        { key: 'new', icon: '📋', label: 'Order Placed', desc: 'We have received your order' },
        { key: 'in-process', icon: '⚙️', label: 'Processing', desc: 'We are preparing your order' },
        { key: 'in-transit', icon: '🚚', label: 'Shipped', desc: 'Your order is on the way' },
        { key: 'completed', icon: '✅', label: 'Delivered', desc: 'Order has been delivered' },
    ];

    const statusOrder = ['new', 'in-process', 'in-transit', 'completed'];
    const currentIdx = orderData ? statusOrder.indexOf(orderData.status) : -1;

    const statusColor = (status) => {
        const m = { 'new': '#3B82F6', 'in-process': '#F59E0B', 'in-transit': '#8B5CF6', 'completed': '#10B981' };
        return m[status] || '#888';
    };

    return (
        <main style={{ padding: 0, minHeight: 'calc(100vh - 60px)', background: '#FAFAF7' }}>

            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(165deg, #2C1B10 0%, #5D4037 50%, #8B6F47 100%)',
                padding: '3rem 1.5rem 2.5rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{
                    position: 'absolute', top: '-40px', right: '-40px',
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20px', left: '-30px',
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                }} />

                <div style={{
                    fontSize: '2.2rem', marginBottom: '0.3rem',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
                }}>📦</div>
                <h1 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 900, fontSize: '1.5rem',
                    letterSpacing: '2px', color: 'white', margin: '0 0 0.4rem',
                    textTransform: 'uppercase',
                }}>Track Your Order</h1>
                <p style={{
                    color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem',
                    fontWeight: 500, marginBottom: '1.5rem',
                }}>Enter your Order ID to see real-time status</p>

                {/* Search Bar */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'white', borderRadius: '50px',
                    padding: '4px', maxWidth: '380px', margin: '0 auto',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                }}>
                    <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter Order ID..."
                        style={{
                            flex: 1, border: 'none', outline: 'none',
                            padding: '0.8rem 1.2rem', fontSize: '0.9rem',
                            fontFamily: "'Inter', sans-serif", fontWeight: 600,
                            background: 'transparent', color: '#2C1B10',
                            borderRadius: '50px',
                        }}
                    />
                    <button
                        onClick={handleTrack}
                        disabled={loading}
                        style={{
                            background: loading ? '#999' : 'linear-gradient(135deg, #2C1B10, #5D4037)',
                            color: 'white', border: 'none',
                            padding: '0.8rem 1.8rem', borderRadius: '50px',
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 800, fontSize: '0.8rem',
                            letterSpacing: '1px', cursor: loading ? 'wait' : 'pointer',
                            textTransform: 'uppercase', whiteSpace: 'nowrap',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                            boxShadow: '0 4px 12px rgba(44,27,16,0.3)',
                        }}
                        onMouseEnter={e => { if (!loading) { e.target.style.transform = 'scale(1.03)'; } }}
                        onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                    >
                        {loading ? '...' : 'TRACK'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '1.5rem', maxWidth: '500px', margin: '0 auto' }}>

                {/* Error State */}
                {error && (
                    <div style={{
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', marginBottom: '1.5rem',
                        animation: 'fadeSlideIn 0.4s ease',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>😕</div>
                        <p style={{
                            color: '#991B1B', fontWeight: 700, fontSize: '0.95rem',
                            margin: '0 0 0.25rem',
                        }}>Order Not Found</p>
                        <p style={{ color: '#B91C1C', fontSize: '0.8rem', margin: 0 }}>
                            Please double-check your Order ID and try again.
                        </p>
                    </div>
                )}

                {/* No Results Placeholder */}
                {!orderData && !error && !loading && (
                    <div style={{
                        textAlign: 'center', padding: '3rem 1rem',
                        animation: 'fadeSlideIn 0.4s ease',
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #F5F0EB, #E8E0D8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.2rem', fontSize: '2rem',
                        }}>🔍</div>
                        <p style={{
                            color: '#8B6F47', fontWeight: 700, fontSize: '1rem',
                            marginBottom: '0.3rem',
                        }}>Where's my order?</p>
                        <p style={{
                            color: '#A89680', fontSize: '0.82rem', lineHeight: 1.5,
                        }}>Enter your Order ID above to<br />track your package in real-time</p>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{
                            width: '40px', height: '40px', border: '3px solid #E8E0D8',
                            borderTop: '3px solid #2C1B10', borderRadius: '50%',
                            margin: '0 auto 1rem',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                        <p style={{ color: '#8B6F47', fontWeight: 600, fontSize: '0.9rem' }}>
                            Finding your order...
                        </p>
                    </div>
                )}

                {/* Order Result */}
                {orderData && (
                    <div style={{ animation: 'fadeSlideIn 0.4s ease' }}>
                        {/* Order Card */}
                        <div style={{
                            background: 'white', borderRadius: '18px',
                            padding: '1.3rem', marginBottom: '1.5rem',
                            boxShadow: '0 2px 12px rgba(44,27,16,0.06)',
                            border: '1px solid rgba(44,27,16,0.06)',
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', marginBottom: '0.8rem',
                            }}>
                                <div>
                                    <p style={{
                                        fontSize: '0.7rem', color: '#A89680',
                                        textTransform: 'uppercase', letterSpacing: '1px',
                                        fontWeight: 700, margin: '0 0 0.15rem',
                                    }}>Order ID</p>
                                    <p style={{
                                        fontSize: '1.05rem', fontWeight: 800,
                                        color: '#2C1B10', margin: 0,
                                        fontFamily: "'Inter', monospace",
                                    }}>#{orderData.id}</p>
                                </div>
                                <span style={{
                                    background: statusColor(orderData.status) + '18',
                                    color: statusColor(orderData.status),
                                    padding: '0.35rem 0.9rem', borderRadius: '50px',
                                    fontSize: '0.7rem', fontWeight: 800,
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>
                                    {orderData.status?.replace('-', ' ')}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '0.6rem 0 0',
                                borderTop: '1px solid #F5F0EB',
                            }}>
                                <div>
                                    <p style={{ fontSize: '0.7rem', color: '#A89680', margin: '0 0 0.1rem', fontWeight: 600 }}>Date</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C1B10', margin: 0 }}>
                                        {new Date(orderData.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.7rem', color: '#A89680', margin: '0 0 0.1rem', fontWeight: 600 }}>Total</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#2C1B10', margin: 0 }}>₹{orderData.total}</p>
                                </div>
                            </div>

                            {/* Customer Info */}
                            {orderData.customer_name && (
                                <div style={{
                                    marginTop: '0.8rem', padding: '0.6rem 0 0',
                                    borderTop: '1px solid #F5F0EB',
                                }}>
                                    <p style={{ fontSize: '0.7rem', color: '#A89680', margin: '0 0 0.1rem', fontWeight: 600 }}>Customer</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C1B10', margin: 0 }}>
                                        {orderData.customer_name}
                                        {orderData.customer_phone && <span style={{ color: '#A89680', fontWeight: 500 }}> · {orderData.customer_phone}</span>}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <div style={{
                            background: 'white', borderRadius: '18px',
                            padding: '1.5rem',
                            boxShadow: '0 2px 12px rgba(44,27,16,0.06)',
                            border: '1px solid rgba(44,27,16,0.06)',
                        }}>
                            <h3 style={{
                                fontSize: '0.75rem', color: '#A89680', margin: '0 0 1.2rem',
                                textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700,
                            }}>Order Progress</h3>

                            {steps.map((step, i) => {
                                const isActive = i <= currentIdx;
                                const isCurrent = i === currentIdx;
                                const isLast = i === steps.length - 1;
                                const color = isActive ? statusColor(step.key) : '#D5CFC8';

                                return (
                                    <div key={step.key} style={{ display: 'flex', gap: '1rem' }}>
                                        {/* Left: Icon + Line */}
                                        <div style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', width: '40px', flexShrink: 0,
                                        }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                background: isActive ? color + '18' : '#F5F0EB',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.1rem', position: 'relative',
                                                border: isCurrent ? `2px solid ${color}` : '2px solid transparent',
                                                transition: 'all 0.3s ease',
                                                boxShadow: isCurrent ? `0 0 0 4px ${color}22` : 'none',
                                            }}>
                                                {step.icon}
                                                {isCurrent && (
                                                    <div style={{
                                                        position: 'absolute', top: '-2px', right: '-2px',
                                                        width: '10px', height: '10px', borderRadius: '50%',
                                                        background: color, border: '2px solid white',
                                                    }} />
                                                )}
                                            </div>
                                            {!isLast && (
                                                <div style={{
                                                    width: '2px', flex: 1, minHeight: '24px',
                                                    background: i < currentIdx
                                                        ? `linear-gradient(${statusColor(steps[i].key)}, ${statusColor(steps[i + 1].key)})`
                                                        : '#EDEBE8',
                                                    borderRadius: '2px',
                                                    transition: 'background 0.3s ease',
                                                }} />
                                            )}
                                        </div>

                                        {/* Right: Content */}
                                        <div style={{
                                            paddingBottom: isLast ? '0' : '1rem',
                                            flex: 1,
                                        }}>
                                            <h4 style={{
                                                margin: '0 0 0.15rem', fontSize: '0.9rem',
                                                fontWeight: isActive ? 800 : 600,
                                                color: isActive ? '#2C1B10' : '#B5AEA4',
                                                transition: 'color 0.3s ease',
                                            }}>
                                                {step.label}
                                                {isCurrent && (
                                                    <span style={{
                                                        marginLeft: '0.5rem', fontSize: '0.6rem',
                                                        background: color + '18', color: color,
                                                        padding: '0.15rem 0.5rem', borderRadius: '50px',
                                                        fontWeight: 800, verticalAlign: 'middle',
                                                    }}>CURRENT</span>
                                                )}
                                            </h4>
                                            <p style={{
                                                margin: 0, fontSize: '0.78rem',
                                                color: isActive ? '#8B6F47' : '#C8C2BA',
                                                fontWeight: 500,
                                            }}>{step.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Items Section */}
                        {orderData.items && (() => {
                            let items = [];
                            try { items = JSON.parse(orderData.items); } catch (e) { }
                            if (!items.length) return null;
                            return (
                                <div style={{
                                    background: 'white', borderRadius: '18px',
                                    padding: '1.2rem', marginTop: '1rem',
                                    boxShadow: '0 2px 12px rgba(44,27,16,0.06)',
                                    border: '1px solid rgba(44,27,16,0.06)',
                                }}>
                                    <h3 style={{
                                        fontSize: '0.75rem', color: '#A89680', margin: '0 0 0.8rem',
                                        textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700,
                                    }}>Items Ordered</h3>
                                    {items.map((item, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', padding: '0.5rem 0',
                                            borderBottom: i < items.length - 1 ? '1px solid #F5F0EB' : 'none',
                                        }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#2C1B10' }}>
                                                    {item.name || `Product #${item.id}`}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#A89680' }}>
                                                    Qty: {item.qty || item.quantity || 1}
                                                </p>
                                            </div>
                                            <span style={{ fontWeight: 800, color: '#2C1B10', fontSize: '0.9rem' }}>
                                                ₹{item.price}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </main>
    );
};

export default TrackOrder;
