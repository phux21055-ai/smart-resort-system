import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                // Group AI vendor separately
                if (id.includes('@google/generative-ai')) {
                  return 'vendor-ai';
                }
                // Group calendar vendor separately
                if (id.includes('@fullcalendar')) {
                  return 'vendor-calendar';
                }
                // Group React and all React-dependent libs together to avoid circular deps
                if (id.includes('react') || id.includes('recharts')) {
                  return 'vendor-react';
                }
              }
            }
          }
        }
      }
    };
});
