import React from 'react';

const PrivacyPolicy = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Privacy Policy
            </h1>

            <div className="policy-content" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', color: '#2C1B10' }}>
                <p style={{ marginBottom: '1.5rem' }}>
                    INDRITA FABRICS values customer privacy and handles personal information responsibly.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Information Collection</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Customer details such as name, phone number, address, and payment information are collected solely
                    for order processing, delivery, and customer support purposes.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Data Sharing</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Personal information is shared only with necessary service providers such as courier partners to
                    ensure successful delivery. <strong>INDRITA FABRICS does not sell or misuse customer data.</strong>
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Video Call Privacy</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Video calls are offered to help customers view sarees before purchasing. These video calls are used
                    only for product viewing and assistance and are not recorded or stored.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Communication Channels</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Customers may also contact INDRITA FABRICS via phone or WhatsApp. Communication details are used
                    only to respond to customer inquiries and process orders.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Consent</h3>
                <p style={{ marginBottom: '2rem' }}>
                    By placing an order, customers consent to the collection and use of their information as described
                    in this policy.
                </p>
            </div>
        </main>
    );
};

export default PrivacyPolicy;
