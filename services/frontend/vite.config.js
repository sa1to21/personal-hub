import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 80,
    proxy: {
      '/api/auth': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/projects': {
        target: process.env.VITE_TASK_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/tasks': {
        target: process.env.VITE_TASK_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/checklists': {
        target: process.env.VITE_TASK_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/labels': {
        target: process.env.VITE_TASK_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
