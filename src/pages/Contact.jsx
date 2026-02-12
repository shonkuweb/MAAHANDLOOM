import React, { useState } from 'react';

const Contact = () => {
    const [status, setStatus] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone') || 'Not provided';
        const message = formData.get('message');

        const whatsappMessage = `✨ New Inquiry from Indrita Fabrics Website ✨
---------------------------------
👤 Name: ${name}
📧 Email: ${email}
📱 Phone: ${phone}
💬 Message: ${message}
---------------------------------`;

        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/919800131516?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');

        setStatus('success');
        e.target.reset();
        if (window.showToast) {
            window.showToast('Redirecting to WhatsApp...', 'success');
        }

        setTimeout(() => setStatus(''), 3000);
    };

    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '0.5rem', fontFamily: 'Great Vibes, cursive', fontSize: '3rem' }}>
                Contact Us
            </h1>
            <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
                We'd love to hear from you. Send us a message!
            </p>

            <form onSubmit={handleSubmit} className="contact-form-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                    <input name="name" type="text" className="modern-input" placeholder="Your Name" required />
                </div>
                <div className="input-group">
                    <input name="email" type="email" className="modern-input" placeholder="Your Email" required />
                </div>
                <div className="input-group">
                    <input name="phone" type="tel" className="modern-input" placeholder="Your Phone (Optional)" />
                </div>
                <div className="input-group">
                    <textarea name="message" className="modern-input" placeholder="Your Message" rows="5"
                        style={{ resize: 'none' }} required></textarea>
                </div>

                <button type="submit" className="btn-save-modern" style={{ marginTop: '1rem' }}>
                    {status === 'success' ? 'REDIRECTING...' : 'SEND MESSAGE'}
                </button>
            </form>
        </main>
    );
};

export default Contact;
