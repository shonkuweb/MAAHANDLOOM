import React, { useState } from 'react';

const Contact = () => {
    const [status, setStatus] = useState('');
    const [focused, setFocused] = useState('');

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

    const inputStyle = (name) => ({
        width: '100%',
        padding: '0.85rem 1rem',
        border: `1.5px solid ${focused === name ? '#2C1B10' : '#E8E0D8'}`,
        borderRadius: '12px',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.9rem',
        fontWeight: 500,
        outline: 'none',
        background: focused === name ? 'white' : '#FAFAF7',
        color: '#2C1B10',
        transition: 'all 0.2s ease',
        boxShadow: focused === name ? '0 0 0 3px rgba(44,27,16,0.08)' : 'none',
        boxSizing: 'border-box',
    });

    const labelStyle = {
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#8B6F47',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '0.35rem',
        display: 'block',
    };

    return (
        <main style={{ padding: 0, minHeight: 'calc(100vh - 60px)', background: '#FAFAF7' }}>

            {/* Hero */}
            <div style={{
                background: 'linear-gradient(165deg, #2C1B10 0%, #5D4037 50%, #8B6F47 100%)',
                padding: '2.5rem 1.5rem 2rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '100px', height: '100px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-15px', left: '-20px',
                    width: '70px', height: '70px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                }} />

                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>💬</div>
                <h1 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 900, fontSize: '1.5rem',
                    letterSpacing: '2px', color: 'white', margin: '0 0 0.4rem',
                    textTransform: 'uppercase',
                }}>Contact Us</h1>
                <p style={{
                    color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem',
                    fontWeight: 500, margin: 0,
                }}>We'd love to hear from you</p>
            </div>

            {/* Contact Cards */}
            <div style={{ padding: '1.5rem', maxWidth: '500px', margin: '0 auto' }}>

                {/* Quick Contact Options */}
                <div style={{
                    display: 'flex', gap: '0.75rem', marginBottom: '1.5rem',
                    animation: 'fadeSlideIn 0.4s ease',
                }}>
                    <a href="https://wa.me/919800131516?text=Hi%20Indrita%20Fabrics,%20I%20have%20a%20query"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                            flex: 1, textDecoration: 'none',
                            background: 'white', borderRadius: '14px',
                            padding: '1rem 0.75rem', textAlign: 'center',
                            boxShadow: '0 2px 10px rgba(44,27,16,0.06)',
                            border: '1px solid rgba(44,27,16,0.06)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,27,16,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(44,27,16,0.06)'; }}
                    >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>💬</div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#25D366', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WhatsApp</p>
                        <p style={{ fontSize: '0.68rem', color: '#A89680', margin: 0 }}>Quick reply</p>
                    </a>
                    <a href="tel:+919800131516"
                        style={{
                            flex: 1, textDecoration: 'none',
                            background: 'white', borderRadius: '14px',
                            padding: '1rem 0.75rem', textAlign: 'center',
                            boxShadow: '0 2px 10px rgba(44,27,16,0.06)',
                            border: '1px solid rgba(44,27,16,0.06)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,27,16,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(44,27,16,0.06)'; }}
                    >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>📞</div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3B82F6', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Call Us</p>
                        <p style={{ fontSize: '0.68rem', color: '#A89680', margin: 0 }}>Direct call</p>
                    </a>
                    <a href="mailto:indritafabrics@gmail.com"
                        style={{
                            flex: 1, textDecoration: 'none',
                            background: 'white', borderRadius: '14px',
                            padding: '1rem 0.75rem', textAlign: 'center',
                            boxShadow: '0 2px 10px rgba(44,27,16,0.06)',
                            border: '1px solid rgba(44,27,16,0.06)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,27,16,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(44,27,16,0.06)'; }}
                    >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>✉️</div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', margin: '0 0 0.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                        <p style={{ fontSize: '0.68rem', color: '#A89680', margin: 0 }}>Write to us</p>
                    </a>
                </div>

                {/* Form Card */}
                <div style={{
                    background: 'white', borderRadius: '18px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 12px rgba(44,27,16,0.06)',
                    border: '1px solid rgba(44,27,16,0.06)',
                    animation: 'fadeSlideIn 0.5s ease',
                }}>
                    <h3 style={{
                        fontSize: '0.75rem', color: '#A89680', margin: '0 0 1.2rem',
                        textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700,
                    }}>Send us a message</h3>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Full Name</label>
                            <input name="name" type="text" placeholder="Enter your name"
                                required style={inputStyle('name')}
                                onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Email Address</label>
                            <input name="email" type="email" placeholder="your@email.com"
                                required style={inputStyle('email')}
                                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Phone <span style={{ color: '#C8C2BA', fontWeight: 500 }}>(Optional)</span></label>
                            <input name="phone" type="tel" placeholder="+91 XXXXX XXXXX"
                                style={inputStyle('phone')}
                                onFocus={() => setFocused('phone')} onBlur={() => setFocused('')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Your Message</label>
                            <textarea name="message" placeholder="Tell us how we can help..."
                                rows="4" required
                                style={{ ...inputStyle('message'), resize: 'none' }}
                                onFocus={() => setFocused('message')} onBlur={() => setFocused('')}
                            />
                        </div>

                        <button type="submit" style={{
                            width: '100%',
                            background: status === 'success'
                                ? 'linear-gradient(135deg, #10B981, #059669)'
                                : 'linear-gradient(135deg, #2C1B10 0%, #5D4037 100%)',
                            color: 'white', border: 'none',
                            padding: '0.9rem', borderRadius: '12px',
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 800, fontSize: '0.85rem',
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            cursor: 'pointer', marginTop: '0.25rem',
                            boxShadow: '0 4px 15px rgba(44,27,16,0.25)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(44,27,16,0.35)'; }}
                            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(44,27,16,0.25)'; }}
                        >
                            {status === 'success' ? (
                                <><span>✓</span> Sent via WhatsApp</>
                            ) : (
                                <><span style={{ fontSize: '1rem' }}>💬</span> Send via WhatsApp</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Info Note */}
                <p style={{
                    textAlign: 'center', fontSize: '0.72rem',
                    color: '#B5AEA4', marginTop: '1.2rem',
                    lineHeight: 1.6,
                }}>
                    Your message will be sent via WhatsApp<br />for faster response
                </p>
            </div>

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </main>
    );
};

export default Contact;
