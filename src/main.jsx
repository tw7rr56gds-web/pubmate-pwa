import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// --- CROSS-PLATFORM UI: CAPACITOR ---
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// --- PWA ARCHITEKTUR: SERVICE WORKER ---
import { registerSW } from 'virtual:pwa-register';

/**
 * REACT BOOTSTRAPPING (ENTRY POINT)
 * Initialisiert den Virtual DOM und verankert die deklarative Single Page Application (SPA)
 * im nativen HTML-Dokument. Der StrictMode erzwingt Best-Practices und deckt 
 * asynchrone Nebenwirkungen (Side Effects) im Development-Build auf.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * NATIVE WEB COMPONENTS
 * Initialisiert die UI-Elemente von Ionic Capacitor für das Web-Ökosystem. 
 * Dies ist architektonisch zwingend erforderlich, damit Hardware-Schnittstellen 
 * (wie der Camera-Prompt) auch im PWA-Kontext ohne nativen iOS/Android-Container funktionieren.
 */
defineCustomElements(window);

/**
 * NETWORK INDEPENDENCE & OFFLINE-FIRST
 * Registriert den durch Vite-PWA automatisch generierten Service Worker.
 * Dieser agiert als programmierbarer lokaler Netzwerk-Proxy. Er fängt HTTP-Requests ab,
 * liefert Precaching-Assets aus und ermöglicht die Graceful Degradation bei Offline-Zuständen.
 */
// Feature Detection: Verhindert Laufzeitfehler auf inkompatiblen oder veralteten Browsern
if ('serviceWorker' in navigator) {
  registerSW({ 
    // Immediate-Flag zwingt den Worker zur sofortigen Übernahme des Scopes (Lifecycle-Optimierung)
    immediate: true, 
    
    onRegistered(registration) {
      console.log('[PWA Bootstrapper] Service Worker erfolgreich registriert.', registration);
    },
    onRegisterError(error) {
      console.error('[PWA Bootstrapper] Kritischer Fehler bei der Service Worker Registrierung:', error);
    }
  });
}