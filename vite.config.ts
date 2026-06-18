import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // 提高 chunk 大小警告限制到 1000KB
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // 手動分割代碼以減少主包大小
          manualChunks: {
            // 將 React 相關庫分離
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // 將圖表庫分離
            'charts': ['recharts'],
            // 將日期處理庫分離
            'date-utils': ['date-fns'],
            // 將其他大型第三方庫分離
            'oauth': ['@react-oauth/google'],
            'supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
