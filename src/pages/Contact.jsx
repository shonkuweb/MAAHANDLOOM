import React from 'react';

const Contact = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '300' }}>Contact Us</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Get in Touch</h2>
                    <p style={{ marginBottom: '1rem' }}>
                        Have questions about our products or your order? We're here to help.
                    </p>
                    <div style={{ marginBottom: '2rem' }}>
                        <p><strong>Email:</strong> support@indritafabrics.com</p>
                        <p><strong>Phone:</strong> +91 98765 43210</p>
                        <p><strong>Address:</strong> 123 Weavers Lane, Textile Hub, WB, India</p>
                    </div>
                </div>

                <div style={{ background: '#f9f9f9', padding: '2rem', borderRadius: '8px' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Send a Message</h2>
                    <form onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Name</label>
                            <input type="text" style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }} required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                            <input type="email" style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }} required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Message</label>
                            <textarea rows="4" style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }} required></textarea>
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '1rem', background: 'black', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SEND MESSAGE</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
