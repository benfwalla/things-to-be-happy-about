import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/feed': {
        target: 'https://nautical-vulture-879.convex.site',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
