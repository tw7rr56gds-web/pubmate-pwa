import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

/**
 * @file firebase.js
 * @description Zentrale Konfigurations- und Initialisierungsschicht für das 
 * Mobile Backend as a Service (MBaaS). Kapselt die Serverless-Infrastruktur 
 * von Google Firebase für die Nutzung innerhalb der React SPA.
 */

/**
 * --- MBaaS CONFIGURATION ---
 * Die Injektion der Projekt-Spezifikationen erfolgt über Vite-Umgebungsvariablen (.env).
 * * ARCHITEKTUR-HINWEIS ZUR SICHERHEIT: 
 * Bei clientseitigen Applikationen (SPAs/PWAs) sind diese Keys im kompilierten Code 
 * zwingend öffentlich einsehbar, da der Browser sie zur Kommunikation benötigt. 
 * Die tatsächliche Absicherung (Defense in Depth) erfolgt NICHT durch das Verbergen 
 * dieser Keys, sondern ausschließlich über serverseitige Firestore Security Rules 
 * (Row-Level Security) sowie HTTP-Referrer-Einschränkungen.
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

// Singleton-Instanziierung der Kernanwendung
const app = initializeApp(firebaseConfig);

// --- SERVICE EXPORTS (Modulare Bereitstellung der Backend-Schnittstellen) ---

/**
 * 1. Cloud Firestore (Database)
 * NoSQL-Dokumentendatenbank für persistente, relationale Datenhaltung und 
 * synchrone Echtzeit-Updates (WebSocket-basiert).
 */
export const db = getFirestore(app);

/**
 * 2. Firebase Authentication (IAM)
 * Identity and Access Management zur sicheren Nutzer-Authentifizierung 
 * (implementiert branchenübliche Standards wie JWT-basierte Sessions).
 */
export const auth = getAuth(app);

/**
 * 3. Firebase Cloud Storage
 * Objektspeicher (BLOB-Storage) für unstrukturierte, binäre Mediendateien 
 * (primär genutzt für den asynchronen Upload nativer Kamera-Erfassungen via Capacitor).
 */
export const storage = getStorage(app);

/**
 * 4. Firebase Cloud Messaging (FCM)
 * Abstraktionsschicht für die Web Push API. Essentziell für die Erfüllung der 
 * PWA-Säule "Re-Engageability", um asynchrone Hintergrundsignale an den Service Worker zu routen.
 */
export const messaging = getMessaging(app);