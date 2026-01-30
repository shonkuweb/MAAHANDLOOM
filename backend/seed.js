import db from './database.js';

const sampleProducts = [
    {
        id: 'P1',
        name: 'Surat Silk Saree',
        description: 'Premium Surat Silk Saree with elegant border.',
        price: 2500,
        category: 'Surat Silk Special',
        qty: 10,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d30de7?q=80&w=1974&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1610030469983-98e550d30de7?q=80&w=1974&auto=format&fit=crop'])
    },
    {
        id: 'P2',
        name: 'Handloom Cotton Kraft',
        description: 'Authentic handloom cotton saree for daily wear.',
        price: 1200,
        category: 'Handloom Special',
        qty: 15,
        image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2048&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2048&auto=format&fit=crop'])
    },
    {
        id: 'P3',
        name: 'Shantipuri Saree',
        description: 'Traditional Shantipuri weave with intricate patterns.',
        price: 1800,
        category: 'Shantipuri Special',
        qty: 8,
        image: 'https://images.unsplash.com/photo-1590736962295-86641e410714?q=80&w=1964&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1590736962295-86641e410714?q=80&w=1964&auto=format&fit=crop'])
    },
    {
        id: 'P4',
        name: 'Organic Cotton Variety',
        description: 'Soft and breathable organic cotton saree.',
        price: 950,
        category: 'Cotton Varieties',
        qty: 20,
        image: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2070&auto=format&fit=crop',
        images: JSON.stringify(['https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2070&auto=format&fit=crop'])
    }
];

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO products (id, name, description, price, category, qty, image, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    sampleProducts.forEach(p => {
        stmt.run(p.id, p.name, p.description, p.price, p.category, p.qty, p.image, p.images);
    });
    stmt.finalize();
    console.log('Sample products inserted.');
});
