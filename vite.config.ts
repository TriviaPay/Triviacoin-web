import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Avoid HMR transport.send() throwing when `ws` is not ready yet (e.g. agent
    // mode enables console forwarding). Uncaught rejections would recurse via sendError.
    forwardConsole: false,
    proxy: {
      // Browser fetch() to presigned S3 JSON is often blocked by CORS; proxy matches RN (no CORS).
      '/__proxy/triviapay-assets': {
        target: 'https://triviapay-assets.s3.us-east-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__proxy\/triviapay-assets/, ''),
      },
    },
  },
})
