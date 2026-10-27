import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // PWA: saytdan "Ilovani o'rnatish" — kompyuter va telefonda alohida oynada ochiladi
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'UZ-GROW Tashkiliy Tuzilma',
        short_name: 'UZ-GROW HR',
        description: "UZ-GROW bo'limlari, xodimlar va anketalar",
        lang: 'uz',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f6f2',
        theme_color: '#1d7a3e',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Ilova qobig'i keshlanadi; Supabase so'rovlari har doim tarmoqdan
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-css' } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\//, handler: 'CacheFirst', options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
        ],
      },
    }),
  ],
  base: '/',
  server: { port: 5180, strictPort: true },
})
