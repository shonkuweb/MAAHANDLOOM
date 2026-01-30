import React from 'react';

const Refund = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', lineHeight: '1.6' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '300' }}>Refund & Return Policy</h1>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Returns</h2>
                <p>
                    We have a 7-day return policy, which means you have 7 days after receiving your item to request a return.
                    To be eligible for a return, your item must be in the same condition that you received it,
                    unworn or unused, with tags, and in its original packaging.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Refunds</h2>
                <p>
                    We will notify you once we’ve received and inspected your return, and let you know if the refund was approved or not.
                    If approved, you’ll be automatically refunded on your original payment method within 10 business days.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Damages and issues</h2>
                <p>
                    Please inspect your order upon reception and contact us immediately if the item is defective, damaged or if you receive the wrong item,
                    so that we can evaluate the issue and make it right.
                </p>
            </section>

            <section>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Contact</h2>
                <p>
                    For any return questions, you can contact us at <a href="mailto:returns@indritafabrics.com">returns@indritafabrics.com</a>.
                </p>
            </section>
        </div>
    );
};

export default Refund;
