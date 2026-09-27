import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'CMS_')
  return {
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.CMS_PROXY_TARGET || env.CMS_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
