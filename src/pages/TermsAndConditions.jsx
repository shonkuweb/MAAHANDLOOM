import React from 'react';

const TermsAndConditions = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Terms & Conditions
            </h1>

            <div className="policy-content" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', color: '#2C1B10' }}>
                <p style={{ marginBottom: '1.5rem' }}>
                    Welcome to <strong>INDRITA FABRICS</strong>. By placing an order with us—whether online, via phone,
                    WhatsApp, or video call—you agree to the following Terms & Conditions. These terms exist to clearly
                    define the rights and responsibilities of both the customer and INDRITA FABRICS and to ensure a
                    transparent shopping experience.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Payment Options</h3>
                <p style={{ marginBottom: '1rem' }}>
                    INDRITA FABRICS accepts prepaid payment methods including UPI, credit/debit cards, and net banking.
                    Secure payment gateways are used to ensure safe and convenient transactions for all orders.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Order Placement</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Customers can purchase sarees directly through online platforms or may choose to view sarees through video
                    calls before buying. Video calls are provided as a convenience so customers can inspect designs, colors,
                    and patterns remotely. Customers may also contact INDRITA FABRICS via phone or WhatsApp for assistance,
                    inquiries, or order confirmation.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Product Quality & Variations</h3>
                <p style={{ marginBottom: '1rem' }}>
                    All sarees sold by INDRITA FABRICS are carefully checked before dispatch. However, slight variations in
                    color or appearance may occur due to lighting, screen resolution, or fabric texture. Such variations are
                    natural and do not qualify as defects.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Return & Exchange</h3>
                <p style={{ marginBottom: '1rem' }}>
                    If a customer does not like a saree after receiving it, they may choose either to exchange it for another
                    saree or request a refund, subject to the Return and Refund Policies described separately. The returned
                    saree must meet the eligibility criteria outlined in those policies.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    <strong>Important:</strong> Sarees that are cut, torn, damaged, or altered by the customer are strictly
                    not eligible for return or exchange. Customers are advised to handle the product with care and inspect
                    it before use.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Shipping Charges</h3>
                <p style={{ marginBottom: '1rem' }}>
                    Shipping is completely free for all orders. However, if a customer chooses to return a saree, a return
                    charge of ₹100 will be applicable.
                </p>

                <h3 style={{ fontWeight: '700', marginTop: '2rem', marginBottom: '0.5rem' }}>Agreement</h3>
                <p style={{ marginBottom: '2rem' }}>
                    By placing an order with INDRITA FABRICS, the customer confirms that they have read, understood, and
                    accepted all the Terms & Conditions mentioned herein.
                </p>
            </div>
        </main>
    );
};

export default TermsAndConditions;
