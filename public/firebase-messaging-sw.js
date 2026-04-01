// public/firebase-messaging-sw.js

// --- DEPENDENCY INJECTION ---
// Import der Firebase-Bibliotheken im Kompatibilitätsmodus für den Service Worker Scope.
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

/**
 * @file firebase-messaging-sw.js
 * @description Zentraler Background-Worker für Firebase Cloud Messaging (FCM).
 * Implementiert die 5. PWA-Säule: "Re-Engageability" [vgl. Pfisterer Skript].
 * * ARCHITEKTUR-HINWEIS (Single-Worker-Pattern):
 * Diese Datei wird zur Build-Zeit via VitePWA (importScripts) in den Haupt-Service-Worker 
 * injiziert. Dies verhindert Ressourcenkonflikte zwischen Caching und Messaging.
 */

// --- MBaaS CONFIGURATION ---
// Öffentliche Identifikatoren für das Firebase-Backend. 
// Sicherheitshinweis: Da Service Worker keinen Zugriff auf Vite-Umgebungsvariablen haben,
// ist die Deklaration hier architektonisch korrekt. Die Absicherung erfolgt serverseitig 
// via HTTP-Referrer-Restriktionen in der Google Cloud Console.
const firebaseConfig = {
  apiKey: "AIzaSyDneFSsF25Y3IFTmFQF1w2gHWlBvUr9TVE",
  authDomain: "pubmate-dc3f5.firebaseapp.com",
  projectId: "pubmate-dc3f5",
  storageBucket: "pubmate-dc3f5.firebasestorage.app",
  messagingSenderId: "1952195893",
  appId: "1:1952195893:web:6facb773bb7c18b9acd87c"
};

// Initialisierung der MBaaS-Infrastruktur im isolierten Worker-Scope
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// --- EVENT-DRIVEN ARCHITECTURE: BACKGROUND PUSH ---

/**
 * Nativer Push-Event-Listener auf unterster Browser-Ebene.
 * Durch die Umgehung des Firebase-SDK-Wrappers (onBackgroundMessage) behalten wir die 
 * volle Kontrolle über das asynchrone Promise-Handling. Dies verhindert die vom Betriebssystem 
 * erzwungene Strafmeldung ("App wurde im Hintergrund aktualisiert").
 */
self.addEventListener('push', (event) => {
  console.log('[FCM Service Worker] Nativer Push-Event abgefangen.');

  let payload = {};
  
  try {
    // Defensives Parsing: Fängt leere oder fehlerhafte Datenströme (Payloads) sicher ab
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error('[FCM Service Worker] JSON Parsing Error - Fallback wird genutzt:', err);
  }

  // Defensive Datenextraktion: Priorisiert strukturierte Custom-Data über Standard-Notifications
  const title = payload?.data?.title || payload?.notification?.title || 'PubMate: Neue Aktivität';
  const body = payload?.data?.body || payload?.notification?.body || 'Es gibt Neuigkeiten in deiner Nähe.';

  // Konfiguration der systemnativen Darstellung (UX-Design)
  const options = {
    body: body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100], // Haptisches Feedback für unterstützte Endgeräte
    data: payload?.data || {} // Persistiert Custom-Data für den Klick-Event
  };

  // SERVICE WORKER LIFECYCLE MANAGEMENT:
  // event.waitUntil friert den Terminierungs-Prozess des Workers ein, 
  // bis das UI-Rendering der Benachrichtigung vollständig abgeschlossen ist.
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// --- USER INTERACTION & RE-ENGAGEMENT ---

/**
 * Notification Click Listener
 * Steuert das Fokus-Management: Reaktiviert die PWA beim Klick auf das System-Banner.
 */
self.addEventListener('notificationclick', (event) => {
  // Schließt das native Benachrichtigungsfenster sofort
  event.notification.close();
  
  // Fokussiert einen bereits offenen App-Tab (Ressourcenschonung) oder öffnet einen neuen
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});