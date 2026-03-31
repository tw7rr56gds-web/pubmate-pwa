import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * VITE BUILD & PWA CONFIGURATION
 * Zentrale Konfigurationsdatei für den Modul-Bundler und die Progressive Web App.
 * Implementiert automatisiert die PWA-Säulen "Network Independence" (Offline-Fähigkeit) 
 * und "Installable" (Manifest) in den Build- und Deployment-Prozess.
 */
export default defineConfig({
  // --- DISTRIBUTION / HOSTING ---
  // GitHub Pages hostet Repositories in Unterordnern. 
  // Dieser Base-Pfad referenziert exakt den Repository-Namen und verhindert 
  // 404-Fehler (White Screen) beim Auflösen von relativen Asset-Pfaden.
  base: '/pubmate-pwa/', 

  plugins: [
    react(),
    
    // --- PWA GENERATOR (Vite-Plugin-PWA) ---
    VitePWA({
      // Automatisches Update des Service Workers bei neuem Deployment, 
      // um "Stale Cache" (veraltete App-Versionen) beim Nutzer zu vermeiden.
      registerType: 'autoUpdate',
      
      // Aktiviert den Service Worker auch im lokalen Entwicklungsmodus ('npm run dev').
      // Ermöglicht das Testen von Caching-Strategien ohne Production-Builds.
      devOptions: {
        enabled: true
      },

      // --- NETWORK INDEPENDENCE: WORKBOX & CACHING ---
      workbox: {
        // Precaching: Lädt alle statischen UI-Ressourcen (HTML, JS, CSS, Media) 
        // sofort bei der Installation in den lokalen Cache (Offline-First-Architektur).
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // Runtime Caching: Dynamische Interzeption für externe API-Calls.
        runtimeCaching: [
          {
            // Abfangen aller asynchronen Anfragen an die Overpass API (Location Data).
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            
            // Caching-Strategie 'NetworkFirst': 
            // Priorisiert aktuelle Server-Daten. Fällt die Verbindung aus (Offline), 
            // dient der Cache als Fallback zur Aufrechterhaltung der Funktionalität.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osm-api-cache',
              expiration: {
                maxEntries: 10,                 // Limitiert Speicherbedarf auf dem Endgerät
                maxAgeSeconds: 60 * 60 * 24 * 7 // Cache-Invalidierung nach 7 Tagen
              },
              cacheableResponse: {
                statuses: [0, 200]              // Verhindert das Caching von Fehlercodes
              }
            }
          }
        ]
      },

      // --- INSTALLABLE, LINKABLE, DISCOVERABLE ---
      // Dynamische Injektion des Web App Manifests in den Build-Output.
      // Definiert die nativ-wirkende UX auf dem Homescreen des Endgeräts.
      manifest: {
        name: 'PubMate',
        short_name: 'PubMate',
        description: 'Finde Leute zum Anstoßen in deiner Nähe!',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone', // Entfernt Browser-Chrome für eine immersive Fullscreen-UX
        icons: [
          {
            src: 'icon-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Best Practice für adaptive Android-Icons
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