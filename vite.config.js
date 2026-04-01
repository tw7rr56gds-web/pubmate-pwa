import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * @file vite.config.js
 * @description Zentrale Orchestrierungsschicht für das Build-Management und die 
 * Progressive Web App (PWA) Konfiguration.
 * Implementiert eine hybride Offline-Strategie sowie die "Single-Worker-Architektur"
 * zur konfliktfreien Integration von Firebase Cloud Messaging (FCM).
 */
export default defineConfig({
  // --- DEPLOYMENT / CI-CD ---
  // Absolute Pfad-Referenzierung zur Vermeidung von 404-Fehlern beim 
  // statischen Hosting via GitHub Pages.
  base: '/pubmate-pwa/', 

  plugins: [
    react(),
    
    // --- PWA BUNDLER (Vite-Plugin-PWA) ---
    VitePWA({
      registerType: 'autoUpdate',
      
      devOptions: {
        enabled: true // Aktiviert den Service Worker isoliert im lokalen Dev-Environment
      },

      // --- NETWORK INDEPENDENCE (OFFLINE-FIRST) ---
      workbox: {
        // App-Shell-Pattern: Aggressives Precaching statischer Kernressourcen 
        // für einen optimalen "First Meaningful Paint" (TTI-Reduktion).
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // ARCHITEKTUR-FIX: Single-Worker-Pattern
        // Injektion des FCM-Background-Listeners in den Haupt-Service-Worker.
        // Eliminiert Race-Conditions zwischen lokalem Caching und dem Push-Lifecycle.
        importScripts: ['firebase-messaging-sw.js'],
        
        // Runtime Caching: Dynamische Interzeption externer Netzwerkzugriffe.
        runtimeCaching: [
          {
            // Proxy-Interzeption für asynchrone Geodaten der Overpass API.
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            
            // Strategie 'NetworkFirst': Liefert Live-Daten, nutzt den Cache 
            // jedoch als "Graceful Degradation"-Fallback bei Verbindungsabbrüchen.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osm-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Tage Cache-Retention
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },

      // --- DISCOVERABLE, INSTALLABLE & RE-ENGAGEABLE ---
      manifest: {
        name: 'PubMate',
        short_name: 'PubMate',
        description: 'Finde Leute zum Anstoßen in deiner Nähe!',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone', // Emuliert einen nativen App-Container (ohne Browser-Chrome)
        
        icons: [
          {
            src: 'icon-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Best-Practice für adaptive Android-Icons
          },
          {
            src: 'icon-512x512.png', 
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        
        // RICH INSTALL PROMPT: Visuelle Aufwertung des nativen Installationsdialogs 
        // zur Steigerung der Conversion-Rate (App-Store-Emulation).
        screenshots: [
          {
            src: 'screenshot-mobile.png',
            sizes: '1080x1920', 
            type: 'image/png',
            form_factor: 'narrow' // Definition für mobile Endgeräte
          },
          {
            src: 'screenshot-desktop.png',
            sizes: '1920x1080', 
            type: 'image/png',
            form_factor: 'wide' // Definition für Tablet- und Desktop-Ansichten
          }
        ]
      }
    })
  ]
});