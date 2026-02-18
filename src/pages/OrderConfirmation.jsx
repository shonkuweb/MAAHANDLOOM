import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

const OrderConfirmation = () => {
    const location = useLocation();
    const { clearCart } = useShop();
    const [status, setStatus] = useState('pending');
    const [orderId, setOrderId] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const statusParam = params.get('status');
        const orderIdParam = params.get('orderId');

        if (statusParam) setStatus(statusParam);
        if (orderIdParam) setOrderId(orderIdParam);

        // Clear cart on success
        if (statusParam === 'success') {
            clearCart();
        }
    }, [location]);

    const copyOrderId = () => {
        navigator.clipboard.writeText(orderId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = orderId;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const containerStyle = {
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: '#FFFAF0',
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(44, 27, 16, 0.1)',
        border: '2px solid #2C1B10',
    };

    const iconStyle = (bg) => ({
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem auto',
        background: bg,
        color: 'white',
    });

    const titleStyle = {
        color: '#2C1B10',
        fontSize: '1.5rem',
        fontWeight: 800,
        marginBottom: '0.5rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    };

    const textStyle = {
        color: '#666',
        marginBottom: '0.5rem',
        lineHeight: 1.6,
        fontSize: '0.95rem',
    };

    const orderIdStyle = {
        fontWeight: 'bold',
        fontSize: '0.95rem',
        color: '#2C1B10',
        margin: '1rem 0',
        padding: '0.75rem',
        background: '#f3f4f6',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        border: '1px solid #e5e7eb',
        transition: 'background 0.2s',
        wordBreak: 'break-all',
    };

    const btnPrimary = {
        display: 'block',
        width: '100%',
        padding: '0.9rem 1.5rem',
        background: '#2C1B10',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: 700,
        cursor: 'pointer',
        textDecoration: 'none',
        marginTop: '1.5rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textAlign: 'center',
        transition: 'background 0.2s',
    };

    const btnSecondary = {
        ...btnPrimary,
        background: 'transparent',
        color: '#2C1B10',
        border: '2px solid #2C1B10',
        marginTop: '0.75rem',
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                {status === 'success' && (
                    <>
                        <div style={iconStyle('#22c55e')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h2 style={titleStyle}>Order Placed!</h2>
                        <p style={textStyle}>Your payment was successful. Thank you for shopping with us!</p>
                        {orderId && (
                            <>
                                <div style={orderIdStyle} onClick={copyOrderId}
                                    onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>
                                    <span>{orderId}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#999' }}>Tap to copy Order ID</p>
                            </>
                        )}
                        <Link to="/track-order" style={btnPrimary}>Track Order</Link>
                        <Link to="/" style={btnSecondary}>Continue Shopping</Link>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div style={iconStyle('#ef4444')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h2 style={titleStyle}>Payment Failed</h2>
                        <p style={textStyle}>Your payment could not be processed. Your cart items are still saved — please try again.</p>
                        {orderId && (
                            <p style={{ fontSize: '0.85rem', color: '#999', margin: '0.5rem 0' }}>Reference: {orderId}</p>
                        )}
                        <Link to="/checkout" style={btnPrimary}>Try Again</Link>
                        <Link to="/" style={btnSecondary}>Go Home</Link>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div style={iconStyle('#f59e0b')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <h2 style={titleStyle}>Payment Pending</h2>
                        <p style={textStyle}>Your payment is being processed. This may take a few minutes.</p>
                        {orderId && (
                            <>
                                <div style={orderIdStyle} onClick={copyOrderId}
                                    onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>
                                    <span>{orderId}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </div>
                            </>
                        )}
                        <p style={{ fontSize: '0.85rem', color: '#999' }}>Save your Order ID and check back later.</p>
                        <Link to="/track-order" style={btnPrimary}>Track Order</Link>
                        <Link to="/" style={btnSecondary}>Go Home</Link>
                    </>
                )}
            </div>

            {/* Copy Toast */}
            {copied && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#2C1B10',
                    color: 'white',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    zIndex: 1000,
                    animation: 'slideDown 0.3s ease',
                }}>
                    Order ID Copied!
                </div>
            )}
        </div>
    );
};

export default OrderConfirmation;
