// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

/**
 * FIREBASE CLOUD MESSAGING (FCM) - NATIVE PUSH EVENT LISTENER
 * Nutzt die native Web Push API zur Umgehung von SDK-spezifischen 
 * Routing-Fehlern und "Background update"-Strafmeldungen des Browsers.
 */

const firebaseConfig = {
  apiKey: "AIzaSyDneFSsF25Y3IFTmFQF1w2gHWlBvUr9TVE",
  authDomain: "pubmate-dc3f5.firebaseapp.com",
  projectId: "pubmate-dc3f5",
  storageBucket: "pubmate-dc3f5.firebasestorage.app",
  messagingSenderId: "1952195893",
  appId: "1:1952195893:web:6facb773bb7c18b9acd87c"
};

// Initialisierung der FCM-Umgebung
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * Nativer Listener fängt das Event auf unterster Browser-Ebene ab.
 * Dies garantiert, dass wir das asynchrone Promise (event.waitUntil) 
 * unter eigener Kontrolle halten und Abstürze verhindern.
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Nativer Push-Event abgefangen.');

  let payload = {};
  try {
    // Defensives Parsing: Fängt leere oder fehlerhafte Datenströme ab
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error('[Service Worker] JSON Parsing Error', err);
  }

  // Defensive Datenextraktion: Priorisiert Custom-Data über Standard-Notification
  const title = payload?.data?.title || payload?.notification?.title || 'Neue Aktivität';
  const body = payload?.data?.body || payload?.notification?.body || 'Es gibt Neuigkeiten bei PubMate.';

  const options = {
    body: body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload?.data || {}
  };

  // ZWINGEND: event.waitUntil hält den Worker am Leben, bis das Popup steht!
  // Ohne dieses Promise zeigt Chrome die Straf-Meldung an.
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * NOTIFICATION CLICK LISTENER
 * Steuert das Re-Engagement: Fokussiert die App beim Klick auf das System-Banner.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
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