// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

/**
 * FIREBASE CLOUD MESSAGING (FCM) - SERVICE WORKER
 * Läuft als Hintergrund-Prozess (Background Thread) isoliert vom Main-Thread.
 * Empfängt Push-Nachrichten, auch wenn die PWA (PubMate) gerade geschlossen ist.
 */

// Strikte Client-Konfiguration (Hardcoded, da Service Worker kein import.meta.env unterstützen)
// Security-Hinweis: Die Absicherung erfolgt serverseitig über Google Cloud Domain-Restrictions.
const firebaseConfig = {
  apiKey: "AIzaSyDneFSsF25Y3IFTmFQF1w2gHWlBvUr9TVE",
  authDomain: "pubmate-dc3f5.firebaseapp.com",
  projectId: "pubmate-dc3f5",
  storageBucket: "pubmate-dc3f5.firebasestorage.app",
  messagingSenderId: "1952195893",
  appId: "1:1952195893:web:6facb773bb7c18b9acd87c"
};

// Initialisierung der Firebase-Instanz im Service Worker Scope
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Listener für eintreffende Push-Nachrichten im Hintergrund
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Background Message empfangen:', payload);
  
  // Fallback-Werte, falls das Payload unvollständig ist
  const notificationTitle = payload.notification?.title || 'Neues bei PubMate 🍻';
  const notificationOptions = {
    body: payload.notification?.body || 'Öffne die App für mehr Details.',
    icon: '/icon-192x192.png', // App-Logo in der System-Benachrichtigung
    badge: '/icon-192x192.png', // Kleines Icon für die Statusleiste (Android)
    data: payload.data // Transportiert zusätzliche unsichtbare Daten mit
  };

  // Triggert die native System-Benachrichtigung des Endgeräts
  self.registration.showNotification(notificationTitle, notificationOptions);
});