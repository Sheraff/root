import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsconfigPaths from 'vite-tsconfig-paths'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    viteTsconfigPaths(),
    // VitePWA({
    //   injectRegister: 'script',
    //   strategies: 'injectManifest',
    //   srcDir: './sw',
    //   filename: 'service-worker.ts',
    // }),
  ],
  server: {
    port: 3001,
    strictPort: true,

    // in dev mode, we use Vite's proxy to send all API requests to the backend
    proxy: {
      '/api': {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      }
    }
  },
})