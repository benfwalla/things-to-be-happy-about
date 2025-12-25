import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/feed': {
        target: 'https://hardy-mule-551.convex.site',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
