import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    root: 'src/client',
    build: {
      outDir: '../../dist/client',
      emptyOutDir: true,
      sourcemap: !isProduction,
      minify: isProduction,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
          },
        },
      },
      assetsDir: 'assets',
      // Enable gzip compression
      reportCompressedSize: true,
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@common': path.resolve(__dirname, './src/common')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    // Environment-specific configuration
    define: {
      __DEV__: !isProduction,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
    },
  };
});