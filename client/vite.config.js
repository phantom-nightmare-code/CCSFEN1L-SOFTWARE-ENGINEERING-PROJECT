import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // Allow JSX syntax inside .js files (needed for the files I gave you)
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },

  resolve: {
    extensions: ['.jsx', '.js', '.json'],
  },

  server: {
  port: 5173,
  hmr: { overlay: false },   // ← disable the overlay entirely
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true },
  },
  },
});