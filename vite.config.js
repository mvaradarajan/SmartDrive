import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    VitePWA({
      // We own the service worker so it can handle the share_target POST.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SmartDrive',
        short_name: 'SmartDrive',
        description: 'Capture, tag and organize screenshots and files in Google Drive.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#4f46e5',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'files',
                accept: ['image/*', 'application/pdf', 'text/*', '*/*'],
              },
            ],
          },
        },
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],   // the leading dot allows any subdomain
    hmr: { clientPort: 443 },
  },
})
