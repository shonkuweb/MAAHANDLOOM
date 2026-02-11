import React from 'react';

const ShippingPolicy = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Shipping Policy
            </h1>

            <div className="policy-content" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', color: '#2C1B10' }}>
                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>1. Free Shipping</h3>
                <p style={{ marginBottom: '1rem' }}>
                    INDRITA FABRICS is pleased to offer completely free shipping on all saree orders, regardless of location or order value.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    There are no shipping charges applied at checkout.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Order Processing</h3>
                <p style={{ marginBottom: '1rem' }}>
                    All orders are packed carefully to ensure safe and secure delivery.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    We make every effort to dispatch orders promptly after order confirmation.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    Processing time may vary slightly during peak seasons or high order volume.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>3. Estimated Delivery Time</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Estimated delivery time is up to 7 days, depending on the distance and delivery location.
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                    Delivery timelines may vary based on:
                </p>
                <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                    <li>Customer location</li>
                    <li>Courier partner operations</li>
                    <li>Weather conditions or unforeseen logistical delays</li>
                </ul>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Order Tracking</h3>
                <p style={{ marginBottom: '1rem' }}>
                    After placing an order, customers will receive an Order ID.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    This Order ID can be used to track the order status. Tracking updates will be shared once the order is dispatched.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>5. No Hidden Costs</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Shipping is 100% free.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    No additional shipping fees will be charged at checkout.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    Customers are not required to pay any hidden delivery charges when placing an order.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>6. Return Shipping Charges</h3>
                <p style={{ marginBottom: '1rem' }}>
                    In case of a return:
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    A ₹100 return shipping charge will apply.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    This charge is applicable only when a saree is returned.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    The original free shipping benefit remains unaffected.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>7. Delivery Information</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Customers must provide accurate and complete delivery details while placing the order.
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                    INDRITA FABRICS is not responsible for delays or failed deliveries caused by:
                </p>
                <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                    <li>Incorrect address</li>
                    <li>Incomplete contact details</li>
                    <li>Customer unavailability at the delivery location</li>
                </ul>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>8. Agreement</h3>
                <p style={{ marginBottom: '2rem' }}>
                    By placing an order on our website, customers acknowledge and agree to this Shipping Policy.
                </p>
            </div>
        </main>
    );
};

export default ShippingPolicy;
