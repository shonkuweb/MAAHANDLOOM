import React, { useState } from 'react';

const TrackOrder = () => {
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!orderId) return;

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const res = await fetch(`/api/orders/${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            } else {
                setError('Order not found. Please check your Order ID.');
            }
        } catch (err) {
            setError('Failed to fetch order details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Track Your Order</h2>
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Enter Order ID (e.g., ORD-123...)"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    style={{ flex: 1, padding: '0.8rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button type="submit" disabled={loading} style={{ background: 'black', color: 'white', border: 'none', padding: '0 2rem', borderRadius: '4px' }}>
                    {loading ? 'Checking...' : 'TRACK'}
                </button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {order && (
                <div style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <h3>Order #{order.id}</h3>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                display: 'inline-block', padding: '0.4rem 0.8rem', borderRadius: '4px',
                                background: order.status === 'completed' ? '#d4edda' : '#fff3cd',
                                color: order.status === 'completed' ? '#155724' : '#856404',
                                fontWeight: 'bold', textTransform: 'uppercase'
                            }}>
                                {order.status}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <h4>Items</h4>
                        {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed #eee' }}>
                                <span>{item.name} <small style={{ color: '#666' }}>(x{item.qty})</small></span>
                                <span>₹{item.price * item.qty}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        <span>Total Amount</span>
                        <span>₹{order.total}</span>
                    </div>

                    {order.transaction_id && (
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#888' }}>Transaction ID: {order.transaction_id}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrackOrder;
