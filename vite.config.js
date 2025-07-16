import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app', // <--- Use a wildcard to allow any ngrok-free.app subdomain
      // Or if you pay for ngrok and have a static subdomain, add that specific one.
    ],
  },
});