import React from 'react';

const ReturnPolicy = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Return Policy
            </h1>

            <div className="policy-content" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', color: '#2C1B10' }}>
                <p style={{ marginBottom: '1.5rem' }}>
                    INDRITA FABRICS allows saree returns under clearly defined conditions to maintain quality standards
                    and fairness.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Return Eligibility</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Customers may request a return if they do not like the saree after delivery. The request must be made
                    promptly and the saree must be returned in original, unused condition.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Non-Eligible Items</h3>
                <p style={{ marginBottom: '1rem' }}>
                    <strong>Cut, torn, damaged, washed, or altered sarees are strictly non-returnable.</strong> Any signs
                    of use or mishandling will result in rejection of the return request.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Packaging Requirements</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Returns are accepted only if the saree is sent back properly packed to prevent damage during transit.
                    INDRITA FABRICS reserves the right to inspect returned items before approving an exchange or refund.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Return Charge</h3>
                <p style={{ marginBottom: '1rem' }}>
                    A ₹100 return charge is applicable for every returned saree. This charge helps cover return logistics
                    and quality inspection costs.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Return Options</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Once the saree is returned and approved, the customer may choose either:
                </p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li>Another saree as an exchange, or</li>
                    <li>A refund as per the Refund Policy</li>
                </ul>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Important Note</h3>
                <p style={{ marginBottom: '2rem' }}>
                    Returns that do not comply with these conditions will not be accepted.
                </p>
            </div>
        </main>
    );
};

export default ReturnPolicy;
