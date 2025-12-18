import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true
      },
      '/qr': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/status': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/upload-contacts': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/send-bulk': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/contacts': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
