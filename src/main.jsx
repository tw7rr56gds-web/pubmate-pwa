import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { defineCustomElements } from '@ionic/pwa-elements/loader'

// --- PWA SÄULE: NETWORK INDEPENDENCE ---
// Import des automatischen Registrierungs-Helfers von Vite-PWA.
// Dieser nutzt den Service Worker als "programmable network proxy", 
// um die App offline verfügbar zu machen[cite: 1056, 1066].
import { registerSW } from 'virtual:pwa-register'

/**
 * REACT ROOT INITIALISIERUNG
 * Erstellt den virtuellen DOM-Baum und mountet die App in das 
 * 'root'-Element der index.html[cite: 791, 803].
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/**
 * CAPACITOR PWA ELEMENTS
 * Initialisiert native UI-Elemente (z.B. Kamera-Dialoge), damit diese 
 * auch in der Web-Version (PWA) wie native Komponenten funktionieren[cite: 1114].
 */
defineCustomElements(window);

/**
 * SERVICE WORKER REGISTRIERUNG
 * Implementierung der Offline-First-Strategie laut Aufgabenstellung[cite: 1072, 1073].
 */
// Feature Detection: Prüft, ob der Browser Service Worker unterstützt[cite: 1007, 1063].
if ('serviceWorker' in navigator) {
  registerSW({ 
    immediate: true, // Registriert den Worker sofort beim Laden der Seite [cite: 1008]
    onRegistered(r) {
      console.log('PWA Service Worker erfolgreich registriert!');
    },
    onRegisterError(error) {
      console.error('Fehler bei der Service Worker Registrierung:', error);
    }
  })
}