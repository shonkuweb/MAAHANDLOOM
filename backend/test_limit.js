import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const BASE_URL = process.env.APP_BE_URL || 'http://localhost:3000';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';

async function runTest() {
    console.log(`Target: ${BASE_URL}`);

    // 1. Login
    console.log('Logging in...');
    let token;
    try {
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            password: ADMIN_PASSCODE
        });
        token = loginRes.data.token;
        console.log('Login successful.');
    } catch (e) {
        console.error('Login failed:', e.message);
        return;
    }

    // 2. Add 100 Products
    console.log('Adding 100 dummy products...');
    const headers = { Authorization: `Bearer ${token}` };

    for (let i = 1; i <= 100; i++) {
        const product = {
            id: `TEST_P${Date.now()}_${i}`,
            name: `Test Product ${i}`,
            description: `This is a test product number ${i} to verify database limits.`,
            price: 100 + i,
            category: 'Surat Silk Special',
            qty: 100,
            image: '',
            images: []
        };

        try {
            await axios.post(`${BASE_URL}/api/products`, product, { headers });
            process.stdout.write('.'); // Progress indicator
            if (i % 20 === 0) console.log(` (${i} added)`);
        } catch (e) {
            console.error(`\nFailed to add product ${i}:`, e.message);
            if (e.response) console.error('Response:', e.response.data);
            break; // Stop on first error to debug
        }
    }

    console.log('\nTest completed.');

    // 3. Verify Count
    try {
        const res = await axios.get(`${BASE_URL}/api/products`);
        console.log(`Total Products in DB: ${res.data.length}`);
    } catch (e) {
        console.error('Failed to fetch count:', e.message);
    }
}

runTest();
