import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    // Base path boleh ditukar melalui .env (VITE_BASE_PATH).
    // Default /build/ untuk local. Server gunakan /sistem/public/build/ atau lain.
    base: process.env.VITE_BASE_PATH || '/build/',
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],

});
