import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * VITE BUILD & PWA ORCHESTRATION
 * Zentrale Konfigurationsinstanz für das Asset-Bundling und die PWA-Spezifikationen.
 * Setzt die "Single-Worker-Architektur" um, um Konflikte zwischen dem 
 * Offline-Caching (Workbox) und dem Cloud Messaging (FCM) zu eliminieren.
 */
export default defineConfig({
  // --- DEPLOYMENT / HOSTING ---
  // Verhindert 404-Routing-Fehler auf GitHub Pages durch absolute Pfad-Referenzierung
  base: '/pubmate-pwa/', 

  plugins: [
    react(),
    
    // --- PWA GENERATOR (Vite-Plugin-PWA) ---
    VitePWA({
      registerType: 'autoUpdate',
      
      devOptions: {
        enabled: true // Erlaubt das Testen des Service Workers im lokalen Dev-Server
      },

      // --- PWA SÄULE: NETWORK INDEPENDENCE ---
      workbox: {
        // App-Shell-Pattern: Lädt statische UI-Ressourcen sofort in den lokalen Cache.
        // Ermöglicht einen extrem schnellen "First Meaningful Paint" auch bei 3G-Verbindung.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // --- PWA SÄULE: RE-ENGAGEABILITY (DER MASTER-FIX) ---
        // Injektion des Firebase-Messaging-Scripts in den generierten Caching-Worker.
        // Verhindert die Instanziierung von zwei konkurrierenden Service Workern.
        importScripts: ['firebase-messaging-sw.js'],
        
        // Runtime Caching: Dynamische Interzeption für externe API-Calls.
        runtimeCaching: [
          {
            // Abfangen asynchroner Geodaten-Anfragen an die Overpass API.
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            
            // Strategie 'NetworkFirst': Liefert hochaktuelle Daten, fällt bei 
            // Netzwerkausfall jedoch als Graceful Degradation auf den Cache zurück.
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

      // --- PWA SÄULEN: INSTALLABLE, LINKABLE, DISCOVERABLE ---
      manifest: {
        name: 'PubMate',
        short_name: 'PubMate',
        description: 'Finde Leute zum Anstoßen in deiner Nähe!',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone', // Entfernt den Browser-Chrome für eine native App-UX
        icons: [
          {
            src: 'icon-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Unterstützt adaptive Icon-Masken (Best-Practice für Android)
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