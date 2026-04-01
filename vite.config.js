import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * VITE BUILD & PWA ORCHESTRATION
 * Zentrale Konfigurationsinstanz für das Asset-Bundling und die PWA-Spezifikationen.
 * Implementiert die Single-Worker-Architektur, um Konflikte zwischen dem 
 * Offline-Caching (Workbox) und dem Cloud Messaging (FCM) zu eliminieren.
 */
export default defineConfig({
  // --- DISTRIBUTION / HOSTING ---
  // GitHub Pages hostet Repositories in Unterordnern. 
  // Dieser Base-Pfad referenziert exakt den Repository-Namen und verhindert 404-Fehler.
  base: '/pubmate-pwa/', 

  plugins: [
    react(),
    
    // --- PWA GENERATOR (Vite-Plugin-PWA) ---
    VitePWA({
      registerType: 'autoUpdate',
      
      devOptions: {
        enabled: true
      },

      // --- NETWORK INDEPENDENCE & MESSAGING INTEGRATION ---
      workbox: {
        // Precaching: Lädt statische UI-Ressourcen sofort in den lokalen Cache.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // DER MASTER-FIX: Injektion des Firebase-Messaging-Scripts in den generierten Worker.
        // Verhindert die Instanziierung von zwei konkurrierenden Service Workern.
        importScripts: ['firebase-messaging-sw.js'],
        
        // Runtime Caching: Dynamische Interzeption für externe API-Calls.
        runtimeCaching: [
          {
            // Abfangen asynchroner Anfragen an die Overpass API (Location Data).
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            
            // Strategie 'NetworkFirst' mit Fallback auf den Cache.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osm-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Tage Validität
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },

      // --- INSTALLABLE, LINKABLE, DISCOVERABLE ---
      manifest: {
        name: 'PubMate',
        short_name: 'PubMate',
        description: 'Finde Leute zum Anstoßen in deiner Nähe!',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.png', 
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});