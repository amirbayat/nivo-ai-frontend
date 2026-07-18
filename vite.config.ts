import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // ثبت service worker دستی در main.tsx انجام می‌شود
      manifest: {
        name: 'نیوو',
        short_name: 'نیوو',
        description: 'دستیار هوش مصنوعی نیوو',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#10b981',
        icons: [
          { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // مقالات /blog باید همیشه از شبکه (رندر واقعی بک‌اند) بیایند، نه از app-shell کش‌شده
        navigateFallbackDenylist: [/^\/blog/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: { usePolling: true, interval: 300 },
    // مقالات (SEO) — /blog را بک‌اند رندر می‌کند، نه React (docs/PRD-articles-seo-blog.md
    // بخش ۳). این proxy همون کاری که nginx در پروداکشن می‌کند را در dev شبیه‌سازی می‌کند،
    // تا لینک‌های نسبی /blog/... بدون تغییر بین dev و prod کار کنند.
    proxy: {
      '/blog': {
        target: process.env.VITE_BACKEND_ORIGIN ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
