import React from 'react';

const About = () => {
    return (
        <main style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8', color: '#333' }}>
            <h1 className="text-red"
                style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Great Vibes, cursive', fontSize: '3.5rem' }}>
                About Us
            </h1>

            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                At <strong>Indrita Fabrics</strong>, we celebrate the timeless beauty of handloom and the artisans who bring it
                to life. Rooted in tradition and driven by quality, our journey began with a simple vision — to preserve
                India’s rich weaving heritage while making authentic handcrafted textiles accessible to today’s world.
            </p>

            <p style={{ marginBottom: '1.5rem' }}>
                Each piece in our collection is thoughtfully created using traditional techniques passed down through
                generations. From the careful selection of yarns to the intricate weaving process, every product reflects
                patience, skill, and artistry. No two creations are exactly alike — and that uniqueness is what makes
                handloom truly special.
            </p>

            <p style={{ marginBottom: '1.5rem' }}>
                We work closely with skilled weavers and artisan communities, ensuring ethical practices, fair wages, and
                sustainable craftsmanship. By choosing our products, you are not just purchasing a textile — you are
                supporting livelihoods, culture, and centuries-old traditions.
            </p>

            <p style={{ marginBottom: '1.5rem' }}>
                Blending heritage with contemporary design, <strong>Indrita Fabrics</strong> offers creations that are
                elegant,
                durable, and meaningful. Whether it’s for everyday wear or special occasions, our handloom products are
                designed to be cherished for years to come.
            </p>

            <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', marginTop: '3rem', color: '#2C1B10' }}>
                Thank you for being part of our story and for supporting handmade.
            </p>
        </main>
    );
};

export default About;
