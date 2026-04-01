import React, { useState, useEffect } from 'react';
import { db, storage, messaging } from '../firebase'; 
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { deleteUser, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'; 
import { getToken, onMessage } from 'firebase/messaging'; 

/**
 * SIDEBAR COMPONENT (USER PREFERENCES & SECURITY)
 * Verwaltet das erweiterte Nutzerprofil, Cross-Platform-Features (Kamera), 
 * kritische Account-Operationen und das Push-Notification-Lifecycle-Management.
 */
export const Sidebar = ({ user, userData, setUserData, isOpen, onClose, onLogout }) => {
  // --- REACTIVE STATE MANAGEMENT ---
  const [image, setImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

  // --- PWA: FOREGROUND NOTIFICATION LISTENER ---
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Nachricht im Foreground empfangen:", payload);
      const title = payload.notification?.title || "Neue Aktivität";
      const options = {
        body: payload.notification?.body || "Es gibt Neuigkeiten in deiner Umgebung.",
        icon: "/icon-192x192.png"
      };
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, options);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- CROSS-PLATFORM DEVELOPMENT: CAPACITOR ---
  const takePicture = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true, 
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt 
      });
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      setImage(blob);
    } catch (error) {
      console.log("Hardware-Zugriff abgebrochen oder fehlgeschlagen:", error);
    }
  };

  // --- MBAAS: STORAGE & FIRESTORE SYNCHRONIZATION ---
  const uploadProfilePicture = async () => {
    if (!image) return alert("Bitte wähle zuerst ein Bild aus.");
    setUploadingImage(true);
    const imageRef = ref(storage, `profile_pictures/${user.uid}`);
    try {
      await uploadBytes(imageRef, image);
      const url = await getDownloadURL(imageRef);
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { profilbild_url: url });
      setUserData((prev) => ({ ...prev, profilbild_url: url }));
      alert("Profilbild erfolgreich aktualisiert.");
      setImage(null);
    } catch (error) {
      alert("Fehler beim Upload: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --- PWA: PUSH NOTIFICATIONS (SINGLE-WORKER ARCHITECTURE) ---
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Dein Browser unterstützt die Web Notification API nicht.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        
        // 1,0-ARCHITEKTUR: Wir warten auf den existierenden VitePWA Worker!
        // Dies verhindert den Token-Tod und Worker-Konflikte.
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        
        // Zwingende Zuweisung des Tokens an die persistente Vite-Registrierung
        const currentToken = await getToken(messaging, { 
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration 
        });
        
        if (currentToken) {
          console.log("FCM Device Token:", currentToken);
          alert("Push-Nachrichten aktiviert! (Token in der Konsole)");
        } else {
          alert("Fehler bei der Token-Generierung durch FCM.");
        }
      } else {
        alert("Berechtigung abgelehnt. Anpassung in den Browser-Einstellungen möglich.");
      }
    } catch (e) {
      console.error("Fehler bei der Notification-Registrierung: ", e);
    }
  };

  // --- MBAAS SECURITY: RE-AUTHENTICATION PATTERN ---
  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) return;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordStatus({ type: 'error', msg: 'Mindestens 12 Zeichen, 1 Großbuchstabe und 1 Sonderzeichen erforderlich.' });
      return;
    }
    setIsChangingPassword(true);
    setPasswordStatus({ type: '', msg: '' });

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordStatus({ type: 'success', msg: 'Passwort erfolgreich und sicher aktualisiert.' });
      setOldPassword(''); 
      setNewPassword(''); 
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setPasswordStatus({ type: 'error', msg: 'Das aktuelle Passwort ist nicht korrekt.' });
      } else {
        setPasswordStatus({ type: 'error', msg: 'Sicherheitsfehler: ' + error.message });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("WARNUNG: Dies löscht alle deine Daten unwiderruflich. Fortfahren?");
    if (!confirmDelete) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);
      await deleteUser(user);
      alert("Account erfolgreich entfernt.");
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        alert("Security Policy: Bitte logge dich kurz aus und wieder ein, um den Account zu löschen.");
      } else {
        alert("Löschen fehlgeschlagen: " + error.message);
      }
    }
  };

  // --- DECLARATIVE UI RENDERING (ORIGINAL DESIGN) ---
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose}></div>}
      
      <div className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex-1 overflow-y-auto">
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-800">Einstellungen</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl leading-none" aria-label="Schließen">&times;</button>
          </div>

          <div className="mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Profilbild</h3>
            <div className="flex flex-col gap-3">
              {image ? (
                <p className="text-sm text-green-600 font-bold text-center">Bild bereit zum Upload</p>
              ) : (
                <button onClick={takePicture} className="w-full bg-orange-100 text-orange-700 font-bold py-2.5 rounded-xl shadow-sm hover:bg-orange-200 transition">
                  Foto aufnehmen / wählen
                </button>
              )}
              <button onClick={uploadProfilePicture} disabled={uploadingImage || !image} className={`w-full text-white font-bold py-2.5 rounded-xl transition shadow-sm ${uploadingImage || !image ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}>
                {uploadingImage ? 'Cloud-Sync läuft...' : 'Bild hochladen'}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Metadaten</h3>
            <div className="space-y-2 text-gray-600 text-sm bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p><span className="font-semibold text-gray-800">Handle:</span> @{userData?.benutzername}</p>
              <p><span className="font-semibold text-gray-800">Name:</span> {userData?.vorname} {userData?.nachname}</p>
              <p><span className="font-semibold text-gray-800">Auth-ID:</span> {user?.email}</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Sicherheit</h3>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Zugangsdaten ändern</label>
                <input type="password" placeholder="Aktuelles Passwort" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-2" />
                <input type="password" placeholder="Neues Passwort (min. 12 Zeichen)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-2" />
                <button onClick={handlePasswordChange} disabled={isChangingPassword || !oldPassword || !newPassword} className={`w-full font-bold py-2.5 rounded-xl transition shadow-sm text-sm ${isChangingPassword || !oldPassword || !newPassword ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
                  {isChangingPassword ? 'Wird geprüft...' : 'Sicher aktualisieren'}
                </button>
                {passwordStatus.msg && (
                  <p className={`text-xs font-bold text-center mt-3 leading-tight ${passwordStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{passwordStatus.msg}</p>
                )}
              </div>
              <hr className="border-gray-200" />
              <div>
                <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Gefahrenzone</label>
                <button onClick={handleDeleteAccount} className="w-full bg-white text-red-500 border border-red-200 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-red-50 transition flex justify-center items-center gap-2 text-sm">
                  Account unwiderruflich löschen
                </button>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Re-Engageability</h3>
            <button onClick={requestNotificationPermission} className="w-full bg-blue-50 text-blue-600 border border-blue-200 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition flex justify-center items-center gap-2 text-sm">
              Web Push API aktivieren
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
              Erfahre sofort über Cloud Messaging (FCM), wenn jemand in deiner Nähe ein Treffen plant.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          <button onClick={onLogout} className="w-full bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-red-200 transition flex justify-center items-center gap-2 text-sm">
            Session beenden (Logout)
          </button>
        </div>
      </div>
    </>
  );
};