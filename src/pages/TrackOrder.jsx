import React, { useState } from 'react';

const TrackOrder = () => {
    const [orderId, setOrderId] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleTrack = async () => {
        if (!orderId) {
            window.showToast('Please enter an Order ID', 'error');
            return;
        }

        setLoading(true);
        setError(null);
        setOrderData(null);

        try {
            const res = await fetch(`/api/orders/${orderId}`);
            if (!res.ok) {
                throw new Error('Order not found or Error fetching status');
            }
            const data = await res.json();
            setOrderData(data);
        } catch (err) {
            setError('Order Not Found. Please check the ID.');
            window.showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getTimelineStatus = (currentStatus) => {
        // Simple helper to decide which steps are 'active'
        const steps = ['new', 'in-process', 'in-transit', 'completed'];
        const currentIndex = steps.indexOf(currentStatus);

        // Map display steps: Order Placed -> Processing -> Shipped -> Delivered
        // 'new' -> Order Placed (idx 0)
        // 'in-process' -> Processing (idx 1)
        // 'in-transit' -> Shipped (idx 2)
        // 'completed' -> Delivered (idx 3)

        return (stepIndex) => {
            if (currentIndex === -1) return false; // Unknown status
            return stepIndex <= currentIndex;
        };
    };

    return (
        <main style={{ padding: '0', paddingBottom: '2rem' }}>
            <div className="tracking-hero">
                <h1 className="tracking-title">TRACK YOUR ODER</h1>
                <p className="tracking-subtitle">Enter your Order ID to see the current status</p>

                <div className="search-container">
                    <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="tracking-input"
                        placeholder="ORD-XXXXXX"
                    />
                    <button onClick={handleTrack} className="tracking-btn" disabled={loading}>
                        {loading ? '...' : 'TRACK'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
                    {error}
                </div>
            )}

            {orderData && (
                <div className="tracking-result-container" style={{ display: 'block' }}>
                    <div className="order-summary-card">
                        <div className="order-header-row">
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                ORDER <span id="display-order-id">#{orderData.id}</span>
                            </span>
                            <span className="status-pill">{orderData.status.toUpperCase()}</span>
                        </div>
                        <div className="order-info-row">
                            <span style={{ color: '#666', fontSize: '0.85rem' }}>
                                {new Date(orderData.created_at || Date.now()).toLocaleDateString()}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>₹{orderData.total}</span>
                        </div>
                    </div>

                    <div className="timeline-wrapper">
                        {/* Step 1 */}
                        <div className={`timeline-step ${getTimelineStatus(orderData.status)(0) ? 'active' : ''}`}>
                            <div className="timeline-icon">📝</div>
                            <div className="timeline-content">
                                <h3>Order Placed</h3>
                                <p>We have received your order.</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className={`timeline-step ${getTimelineStatus(orderData.status)(1) ? 'active' : ''}`}>
                            <div className="timeline-icon">⚙️</div>
                            <div className="timeline-content">
                                <h3>Processing</h3>
                                <p>We are preparing your order.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className={`timeline-step ${getTimelineStatus(orderData.status)(2) ? 'active' : ''}`}>
                            <div className="timeline-icon">🚚</div>
                            <div className="timeline-content">
                                <h3>Shipped</h3>
                                <p>Your order is on the way.</p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className={`timeline-step ${getTimelineStatus(orderData.status)(3) ? 'active' : ''}`}>
                            <div className="timeline-icon">🏠</div>
                            <div className="timeline-content">
                                <h3>Delivered</h3>
                                <p>Order has been delivered.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default TrackOrder;
