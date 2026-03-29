import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

/**
 * FIREBASE CONFIGURATION (MBaaS Integration)
 * Nutzung von Firebase als kommerzielles Mobile Backend as a Service[cite: 82, 1166].
 * Die Zugangsdaten werden über Vite-Umgebungsvariablen (.env) geladen,
 * um Sicherheit und Portabilität zu gewährleisten.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Zentraler Initialisierungspunkt der Firebase-App-Instanz
const app = initializeApp(firebaseConfig);

/**
 * EXPORTIERTE SERVICES
 * Diese Module decken die Kernanforderungen an eine moderne PWA ab:
 */

// 1. Cloud Firestore: NoSQL-Datenbank für persistente Datenspeicherung[cite: 80, 1166].
export const db = getFirestore(app);

// 2. Firebase Auth: Management der Nutzer-Authentifizierung (OAuth2/OIDC Prinzip)[cite: 80, 1166, 1167].
export const auth = getAuth(app);

// 3. Firebase Storage: Speicherung von binären Mediendateien wie Profilbildern[cite: 82, 1166].
export const storage = getStorage(app);

// 4. Cloud Messaging (FCM): Ermöglicht die "Re-Engageability" der PWA durch Push-Nachrichten[cite: 1076, 1084].
// Dient als Brücke zwischen Server-Backend und dem Browser-Service-Worker.
export const messaging = getMessaging(app);