import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Critical for Capacitor/WebView relative assets resolution
  server: {
    port: 3000,
    open: false
  }
});
