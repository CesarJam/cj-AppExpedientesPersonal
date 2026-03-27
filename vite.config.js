import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate', // Se actualiza sola cuando subes cambios a Github
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gestión de Expedientes V2',
        short_name: 'Expedientes',
        description: 'Sistema Integral de Directorio y Expedientes de la Consejería Jurídica',
        theme_color: '#2563eb', // Color azul institucional de Tailwind (blue-600)
        background_color: '#ffffff',
        display: 'standalone', // Esto oculta la barra de direcciones del navegador
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})