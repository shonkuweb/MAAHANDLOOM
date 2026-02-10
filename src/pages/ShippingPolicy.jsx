import React from 'react';

const ShippingPolicy = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Shipping Policy
            </h1>

            <div className="policy-content" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', color: '#2C1B10' }}>
                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Free Shipping</h3>
                <p style={{ marginBottom: '1rem' }}>
                    INDRITA FABRICS is pleased to offer <strong>completely free shipping on all saree orders</strong>,
                    regardless of location or order value.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Order Processing</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Orders are packed carefully to ensure safe delivery. While we make every effort to dispatch orders
                    promptly, delivery timelines may vary depending on the customer's location and courier partner.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>No Hidden Costs</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Shipping charges are never applied at checkout. Customers do not need to pay any additional shipping
                    cost when placing an order.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Return Shipping</h3>
                <p style={{ marginBottom: '1rem' }}>
                    In the event of a return, a ₹100 return charge will apply. This charge is applicable only when a
                    saree is returned and does not affect the original free shipping benefit.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Delivery Information</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Customers are advised to provide accurate delivery details to avoid delays or failed deliveries.
                    INDRITA FABRICS is not responsible for delays caused by incorrect address information.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Agreement</h3>
                <p style={{ marginBottom: '2rem' }}>
                    By placing an order, customers acknowledge and accept this shipping policy.
                </p>
            </div>
        </main>
    );
};

export default ShippingPolicy;
