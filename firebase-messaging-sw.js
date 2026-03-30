// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// ACHTUNG: Hier MUSST du deine echte firebaseConfig aus der src/firebase.js reinkopieren!
const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEINE_DOMAIN",
  projectId: "DEIN_PROJECT_ID",
  storageBucket: "DEIN_BUCKET",
  messagingSenderId: "DEINE_SENDER_ID",
  appId: "DEINE_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background Message erhalten:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png' // Zeigt dein App-Icon in der Benachrichtigung an
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});