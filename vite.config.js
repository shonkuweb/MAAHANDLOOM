import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                admin: resolve(__dirname, 'admin.html'),
                categories: resolve(__dirname, 'categories.html'),
                category: resolve(__dirname, 'category.html'),
                checkout: resolve(__dirname, 'checkout.html'),
                contact: resolve(__dirname, 'contact.html'),
                cotton: resolve(__dirname, 'cotton-varieties.html'),
                handloom: resolve(__dirname, 'handloom-special.html'),
                product: resolve(__dirname, 'product_details.html'),
                refund: resolve(__dirname, 'refund.html'),
                shantipuri: resolve(__dirname, 'shantipuri-special.html'),
                surat: resolve(__dirname, 'surat-silk.html'),
                track: resolve(__dirname, 'track-order.html'),
            },
        },
    },
});
