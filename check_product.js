import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./ecommerce.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to the SQLite database.');
});

db.get("SELECT * FROM products WHERE id = ?", ['P1'], (err, row) => {
    if (err) console.error(err.message);
    else console.log('Product P1:', row);
});
