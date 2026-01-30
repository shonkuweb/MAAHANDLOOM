import React from 'react';

const About = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', lineHeight: '1.6' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', fontWeight: '300' }}>About Indrita Fabrics</h1>

            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                Welcome to Indrita Fabrics, where tradition meets contemporary elegance. Based in the heart of India's textile heritage,
                we are dedicated to bringing you the finest handloom sarees and fabrics.
            </p>

            <img
                src="https://images.unsplash.com/photo-1583391733958-e0280eb437f1?auto=format&fit=crop&q=80&w=1000"
                alt="Weaving Loom"
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '2rem' }}
            />

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Our Craft</h2>
            <p style={{ marginBottom: '1.5rem' }}>
                Each piece in our collection is a testament to the skill and dedication of our master weavers.
                From the intricate patterns of Shantipuri cottons to the lustrous sheen of Surat silks,
                we curate only the best materials that tell a story of culture and artistry.
            </p>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Our Promise</h2>
            <p>
                We believe in sustainable fashion and fair trade. By choosing Indrita Fabrics, you are not just buying a product;
                you are supporting a community of artisans and preserving an ancient craft for future generations.
            </p>
        </div>
    );
};

export default About;
