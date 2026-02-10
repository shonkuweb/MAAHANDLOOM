import React from 'react';

const Refund = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Refund Policy
            </h1>

            <div className="policy-content" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', color: '#2C1B10' }}>
                <p style={{ marginBottom: '1.5rem' }}>
                    INDRITA FABRICS provides a fair and customer-friendly refund policy while maintaining strict quality
                    and return standards. Refunds are applicable only under the conditions described below.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Refund Eligibility</h3>
                <p style={{ marginBottom: '1rem' }}>
                    If a customer receives a saree and does not like it for personal reasons such as design preference,
                    color choice, or styling, they may request a refund or opt for an exchange with another saree. This
                    option is available only if the saree is eligible for return under the Return Policy.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Refund Processing</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Once a returned saree is received and inspected by INDRITA FABRICS, the refund process will be initiated.
                    <strong> The refund amount will be credited to the customer's bank account within 7 days from the date
                        the returned saree reaches us.</strong>
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Refund Method</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Refunds are processed only through bank transfer or original payment method. Cash refunds are not provided.
                    Customers must ensure that accurate bank details are shared to avoid delays.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Non-Eligible Refunds</h3>
                <p style={{ marginBottom: '1rem' }}>
                    If the saree is found to be cut, torn, damaged, or altered, the refund request will be rejected.
                    Sarees must be returned in original condition, unused, and properly packed.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Return Charges</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Shipping charges are free at the time of purchase. However, in case of a return, a ₹100 return charge
                    will be deducted or collected to cover logistics and handling costs.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Additional Conditions</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Refunds are not applicable if the customer fails to return the saree within the specified return timeline
                    or if the product does not meet eligibility requirements.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Agreement</h3>
                <p style={{ marginBottom: '2rem' }}>
                    By placing an order, the customer agrees to this refund policy and understands the timelines and
                    conditions involved.
                </p>
            </div>
        </main>
    );
};

export default Refund;
