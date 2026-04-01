import React, { useState, useEffect } from 'react';
import { db, storage, messaging } from '../firebase'; 
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { deleteUser, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'; 
import { getToken, onMessage } from 'firebase/messaging'; 

/**
 * @component Sidebar
 * @description Zentrale Steuerungsinstanz für Nutzerpräferenzen, Sicherheit und Hardware-Zugriff.
 * Implementiert Kernanforderungen mobiler Applikationen:
 * 1. Cross-Platform Hardware-Zugriff (Kamera via Ionic Capacitor)
 * 2. PWA Re-Engageability (Web Push API & Service Worker Integration)
 * 3. Identity & Access Management (Re-Authentication Pattern)
 */
export const Sidebar = ({ user, userData, setUserData, isOpen, onClose, onLogout }) => {
  
  // --- LOKALES STATE MANAGEMENT (React Hooks) ---
  const [image, setImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

  // --- PWA: RE-ENGAGEABILITY (FOREGROUND PUSH) ---
  /**
   * Listener für Push-Nachrichten, während die Applikation aktiv im Vordergrund (Fokus) ist.
   * Da der Service Worker primär für Hintergrund-Tasks zuständig ist, übernimmt 
   * dieser Hook die native Notification API Triggerung im aktiven Zustand.
   */
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Echtzeit-Payload im Foreground empfangen:", payload);
      
      const title = payload.notification?.title || "PubMate Update";
      const options = {
        body: payload.notification?.body || "Es gibt Neuigkeiten in deiner Umgebung.",
        icon: "/icon-192x192.png"
      };
      
      // Feature Detection: Prüft, ob die Notification API vom Browser unterstützt und autorisiert ist
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, options);
      }
    });
    
    // Lifecycle-Cleanup zur Vermeidung von Memory Leaks
    return () => unsubscribe();
  }, []);

  // --- CROSS-PLATFORM INTEGRATION: IONIC CAPACITOR ---
  /**
   * Abstrahiert den Zugriff auf die native Systemkamera oder Galerie.
   * Überbrückt die Lücke zwischen Web-App und nativer Hardware ohne ejecten zu müssen.
   */
  const takePicture = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true, 
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt // Überlässt dem OS die Wahl zwischen Kamera und Galerie
      });
      
      // Transformiert die native URI in einen verarbeitbaren Web-Blob
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      setImage(blob);
    } catch (error) {
      // Graceful Degradation: Abfangen des Fehlers, falls der Nutzer den System-Dialog abbricht
      console.warn("Hardware-Zugriff durch Nutzer abgebrochen oder fehlgeschlagen:", error);
    }
  };

  // --- MBaaS: CLOUD STORAGE & NO-SQL SYNCHRONIZATION ---
  /**
   * Überträgt binäre Mediendateien in den Firebase Cloud Storage und 
   * aktualisiert synchron die referenzierte URL im Firestore NoSQL-Dokument.
   */
  const uploadProfilePicture = async () => {
    if (!image) return alert("Validierungsfehler: Bitte wähle zuerst ein Bild aus.");
    
    setUploadingImage(true);
    const imageRef = ref(storage, `profile_pictures/${user.uid}`);
    
    try {
      await uploadBytes(imageRef, image);
      const url = await getDownloadURL(imageRef);
      
      // Update der Document-Referenz in der Datenbank
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { profilbild_url: url });
      
      // Lokales State-Update für sofortiges UI-Feedback (Optimistic Update)
      setUserData((prev) => ({ ...prev, profilbild_url: url }));
      alert("Profilbild erfolgreich in der Cloud persistiert.");
      setImage(null);
    } catch (error) {
      console.error("Cloud-Sync Error:", error);
      alert("Fehler beim Cloud-Upload: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --- PWA: WEB PUSH API (SINGLE-WORKER ARCHITECTURE) ---
  /**
   * Fordert die Nutzerberechtigung (Consent) für native Push-Nachrichten an 
   * und registriert das FCM-Token an den persistierten Vite-Service-Worker.
   */
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Inkompatibilität: Dieser Browser unterstützt die Web Notification API nicht.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        // MASTER-FIX ARCHITEKTUR: Wir zwingen Firebase, den bereits von Vite installierten
        // Service Worker zu nutzen, anstatt einen redundanten zweiten Worker zu registrieren.
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        
        const currentToken = await getToken(messaging, { 
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration 
        });
        
        if (currentToken) {
          console.log("FCM Device Token:", currentToken);
          alert("Re-Engageability aktiviert! Push-Dienst ist nun einsatzbereit.");
        } else {
          alert("Fehler im Push-Lifecycle: Es konnte kein Token generiert werden.");
        }
      } else {
        alert("Berechtigung abgelehnt. Du kannst dies jederzeit in den Browser-Einstellungen ändern.");
      }
    } catch (error) {
      console.error("Kritischer Fehler bei der Notification-Registrierung: ", error);
    }
  };

  // --- IAM & SECURITY: RE-AUTHENTICATION PATTERN ---
  /**
   * Implementiert das "Defense in Depth"-Prinzip:
   * Sensible Account-Operationen (Passwortwechsel) erfordern zwingend ein 
   * frisches Credential-Ticket, um Session Hijacking am entsperrten Gerät zu verhindern.
   */
  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) return;
    
    // Client-seitige Security Policy Validierung
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordStatus({ type: 'error', msg: 'Security Policy: Mind. 12 Zeichen, 1 Großbuchstabe und 1 Sonderzeichen.' });
      return;
    }
    
    setIsChangingPassword(true);
    setPasswordStatus({ type: '', msg: '' });

    try {
      // 1. Re-Authentifizierung mit altem Passwort erzwingen
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Eigentliches Update durchführen
      await updatePassword(user, newPassword);
      
      setPasswordStatus({ type: 'success', msg: 'Passwort erfolgreich und kryptografisch sicher aktualisiert.' });
      setOldPassword(''); 
      setNewPassword(''); 
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setPasswordStatus({ type: 'error', msg: 'Validierung fehlgeschlagen: Aktuelles Passwort inkorrekt.' });
      } else {
        setPasswordStatus({ type: 'error', msg: 'Sicherheitsfehler: ' + error.message });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * DSGVO/GDPR Compliance: Recht auf Vergessenwerden.
   * Löscht unwiderruflich den Firebase Auth-Nutzer sowie das verknüpfte Firestore-Dokument.
   */
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("WARNUNG: Dies löscht deinen Account und alle zugehörigen Daten unwiderruflich. Fortfahren?");
    if (!confirmDelete) return;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef); // Löschung der NoSQL-Metadaten
      await deleteUser(user);      // Löschung der Identität im Auth-Provider
      alert("Account und alle verknüpften Daten wurden permanent entfernt.");
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        alert("Security Policy greift: Bitte logge dich kurz aus und wieder ein, um diese kritische Aktion zu autorisieren.");
      } else {
        alert("Löschvorgang fehlgeschlagen: " + error.message);
      }
    }
  };

  // --- DECLARATIVE UI RENDERING ---
  return (
    <>
      {/* Modal-Overlay / Backdrop (Schließt Sidebar bei Klick) */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose}></div>}
      
      {/* Off-Canvas Navigation (Sidebar) */}
      <aside className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          
          <header className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-800">Einstellungen</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl leading-none" aria-label="Sidebar schließen">&times;</button>
          </header>

          {/* Sektion 1: Medienverwaltung (Capacitor) */}
          <section className="mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Profilbild</h3>
            <div className="flex flex-col gap-3">
              {image ? (
                <p className="text-sm text-green-600 font-bold text-center">Bild lokal erfasst & bereit zum Upload</p>
              ) : (
                <button onClick={takePicture} className="w-full bg-orange-100 text-orange-700 font-bold py-2.5 rounded-xl shadow-sm hover:bg-orange-200 transition-colors">
                  Kamera / Galerie öffnen
                </button>
              )}
              <button 
                onClick={uploadProfilePicture} 
                disabled={uploadingImage || !image} 
                className={`w-full text-white font-bold py-2.5 rounded-xl transition-all shadow-sm ${uploadingImage || !image ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 active:scale-95'}`}
              >
                {uploadingImage ? 'Cloud-Sync läuft...' : 'Bild in Cloud speichern'}
              </button>
            </div>
          </section>

          {/* Sektion 2: Account Metadaten */}
          <section className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Identität</h3>
            <div className="space-y-2 text-gray-600 text-sm bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p><span className="font-semibold text-gray-800">Handle:</span> @{userData?.benutzername}</p>
              <p><span className="font-semibold text-gray-800">Name:</span> {userData?.vorname} {userData?.nachname}</p>
              <p><span className="font-semibold text-gray-800">Auth-ID:</span> {user?.email}</p>
            </div>
          </section>

          {/* Sektion 3: Sicherheit & IAM */}
          <section className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Sicherheit</h3>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Credentials ändern</label>
                <input 
                  type="password" 
                  placeholder="Aktuelles Passwort" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)} 
                  className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-2 transition-shadow" 
                />
                <input 
                  type="password" 
                  placeholder="Neues Passwort (min. 12 Zeichen)" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-2 transition-shadow" 
                />
                <button 
                  onClick={handlePasswordChange} 
                  disabled={isChangingPassword || !oldPassword || !newPassword} 
                  className={`w-full font-bold py-2.5 rounded-xl transition-all shadow-sm text-sm ${isChangingPassword || !oldPassword || !newPassword ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 active:scale-95'}`}
                >
                  {isChangingPassword ? 'Validierung...' : 'Kryptografisch aktualisieren'}
                </button>
                
                {/* Dynamisches Security-Feedback */}
                {passwordStatus.msg && (
                  <p className={`text-xs font-bold text-center mt-3 leading-tight ${passwordStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {passwordStatus.msg}
                  </p>
                )}
              </div>

              <hr className="border-gray-200" />

              <div>
                <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">GDPR / DSGVO Option</label>
                <button 
                  onClick={handleDeleteAccount} 
                  className="w-full bg-white text-red-500 border border-red-200 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-red-50 transition-colors flex justify-center items-center gap-2 text-sm"
                >
                  Account permanent löschen
                </button>
              </div>

            </div>
          </section>

          {/* Sektion 4: PWA Features */}
          <section className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">PWA Re-Engageability</h3>
            <button 
              onClick={requestNotificationPermission} 
              className="w-full bg-blue-50 text-blue-600 border border-blue-200 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition-colors flex justify-center items-center gap-2 text-sm"
            >
              Web Push API aktivieren
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
              Erfahre sofort über Cloud Messaging (FCM), wenn jemand in deiner Nähe ein Treffen plant.
            </p>
          </section>
        </div>

        <footer className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          <button 
            onClick={onLogout} 
            className="w-full bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-red-200 transition-colors flex justify-center items-center gap-2 text-sm"
          >
            Sichere Session beenden (Logout)
          </button>
        </footer>
        
      </aside>
    </>
  );
};