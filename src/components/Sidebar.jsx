import React, { useState } from 'react';
import { db, storage, messaging } from '../firebase'; 
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { deleteUser, updatePassword } from 'firebase/auth'; 
import { getToken } from 'firebase/messaging'; 

export const Sidebar = ({ user, userData, setUserData, isOpen, onClose, onLogout }) => {
  // --- REACTIVE STATE MANAGEMENT ---
  const [image, setImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

  // --- CROSS-PLATFORM DEVELOPMENT: CAPACITOR ---
  // Zugriff auf native Gerätefunktionen (Kamera/Galerie) über das Capacitor Plugin.
  // Ermöglicht eine "Native-like" Experience bei gleicher Codebasis.
  const takePicture = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true, 
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt 
      });

      // Konvertierung der URI in ein Blob für den Firebase-Upload
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      setImage(blob);
    } catch (error) {
      console.log("Kamera abgebrochen oder Fehler:", error);
    }
  };

  // --- MBAAS: STORAGE & DATABASE ---
  // Speichert das Blob im Firebase Storage und verknüpft die URL im Firestore User-Dokument
  const uploadProfilePicture = async () => {
    if (!image) return alert("Bitte wähle zuerst ein Bild aus.");
    
    setUploadingImage(true);
    const imageRef = ref(storage, `profile_pictures/${user.uid}`);
    
    try {
      await uploadBytes(imageRef, image);
      const url = await getDownloadURL(imageRef);
      
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { profilbild_url: url });
      
      // Lokalen State aktualisieren, damit die UI sofort (reaktiv) umschaltet
      setUserData((prev) => ({ ...prev, profilbild_url: url }));
      alert("Profilbild erfolgreich aktualisiert!");
      setImage(null);
    } catch (error) {
      alert("Fehler beim Hochladen: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --- PWA: RE-ENGAGEABILITY & PROGRESSIVE ENHANCEMENT ---
  // Registriert den Client für Web Push Notifications über Firebase Cloud Messaging (FCM)
  const requestNotificationPermission = async () => {
    // Feature Detection: Laufzeitprüfung, ob die Notification API unterstützt wird
    if (!("Notification" in window)) {
      alert("Dein Browser unterstützt keine Benachrichtigungen.");
      return;
    }

    try {
      // Expliziter Opt-in des Nutzers (Best Practice laut Skript)
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        
        // VAPID Key via Environment Variables injiziert (Sicherheits-Best-Practice)
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

        const currentToken = await getToken(messaging, { vapidKey });
        
        if (currentToken) {
          console.log("Dein FCM Token (für Test-Nachrichten):", currentToken);
          alert("Super! Du bist registriert. (Dein Token steht in der Konsole!)");
        } else {
          alert("Fehler: Konnte kein Token generieren.");
        }
      } else {
        alert("Schade! Du kannst es jederzeit in den Browser-Einstellungen ändern.");
      }
    } catch (e) {
      console.error("Fehler bei der Benachrichtigungs-Anfrage: ", e);
    }
  };

  // --- MBAAS: AUTHENTICATION MANAGEMENT ---
  const handlePasswordChange = async () => {
    if (!newPassword) return;

    // Strikte Client-Validierung zur Vermeidung unnötiger Backend-Calls
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordStatus({ 
        type: 'error', 
        msg: 'Mindestens 12 Zeichen, 1 Großbuchstabe und 1 Sonderzeichen!' 
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus({ type: '', msg: '' });

    try {
      await updatePassword(user, newPassword);
      setPasswordStatus({ type: 'success', msg: 'Passwort erfolgreich geändert! ✅' });
      setNewPassword(''); 
    } catch (error) {
      // Spezifisches Error-Handling für abgelaufene Authentifizierungs-Tokens
      if (error.code === 'auth/requires-recent-login') {
        setPasswordStatus({ 
          type: 'error', 
          msg: 'Sicherheitscheck: Bitte logge dich kurz aus und wieder ein, um das Passwort zu ändern.' 
        });
      } else {
        setPasswordStatus({ type: 'error', msg: 'Fehler: ' + error.message });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("Willst du deinen Account und alle Daten wirklich unwiderruflich löschen? 😢");
    if (!confirmDelete) return;

    try {
      // Löschanforderung an Datenbank und Auth-Service
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      alert("Dein Account wurde erfolgreich gelöscht.");
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        alert("Aus Sicherheitsgründen musst du dich kurz aus- und wieder einloggen, um deinen Account zu löschen.");
      } else {
        alert("Fehler beim Löschen: " + error.message);
      }
    }
  };

  // --- DECLARATIVE UI RENDERING ---
  return (
    <>
      {/* Overlay: Schließt die Sidebar beim Klick daneben */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose}></div>}
      
      {/* Off-Canvas Navigation (Responsive Pattern) */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-800">Einstellungen</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl leading-none">&times;</button>
          </div>

          {/* Sektion: Profilbild (Native Device Features) */}
          <div className="mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Profilbild ändern</h3>
            <div className="flex flex-col gap-3">
              {image ? (
                <p className="text-sm text-green-600 font-bold text-center">✅ Bild ausgewählt!</p>
              ) : (
                <button 
                  onClick={takePicture}
                  className="w-full bg-orange-100 text-orange-700 font-bold py-2.5 rounded-xl shadow-sm hover:bg-orange-200 transition"
                >
                  📸 Foto aufnehmen / auswählen
                </button>
              )}
              <button onClick={uploadProfilePicture} disabled={uploadingImage || !image} className={`w-full text-white font-bold py-2.5 rounded-xl transition shadow-sm ${uploadingImage || !image ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}>
                {uploadingImage ? 'Wird gespeichert...' : 'Bild hochladen'}
              </button>
            </div>
          </div>

          {/* Sektion: Nutzerdaten anzeigen */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Deine Daten</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p><span className="font-semibold text-gray-800">Nutzername:</span> @{userData?.benutzername}</p>
              <p><span className="font-semibold text-gray-800">Name:</span> {userData?.vorname} {userData?.nachname}</p>
              <p><span className="font-semibold text-gray-800">E-Mail:</span> {user?.email}</p>
            </div>
          </div>

          {/* Sektion: Account-Sicherheit */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Sicherheit</h3>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Passwort ändern</label>
                <input
                  type="password"
                  placeholder="Neues Passwort..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-2"
                />
                <button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !newPassword}
                  className={`w-full font-bold py-2.5 rounded-xl transition shadow-sm text-sm ${isChangingPassword || !newPassword ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                >
                  {isChangingPassword ? 'Wird geändert...' : '🔑 Passwort aktualisieren'}
                </button>
                {passwordStatus.msg && (
                  <p className={`text-xs font-bold text-center mt-2 leading-tight ${passwordStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {passwordStatus.msg}
                  </p>
                )}
              </div>

              <hr className="border-gray-200" />

              <div>
                <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Gefahrenzone</label>
                <button onClick={handleDeleteAccount} className="w-full bg-white text-red-500 border border-red-200 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-red-50 transition flex justify-center items-center gap-2 text-sm">
                  🚨 Account unwiderruflich löschen
                </button>
              </div>

            </div>
          </div>

          {/* Sektion: Re-Engageability / Push */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Benachrichtigungen</h3>
            <button 
              onClick={requestNotificationPermission} 
              className="w-full bg-blue-50 text-blue-600 border border-blue-200 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition flex justify-center items-center gap-2"
            >
              🔔 Push-Nachrichten erlauben
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">Erfahre sofort, wenn jemand in deiner Nähe ein Treffen plant.</p>
          </div>
        </div>

        {/* Footer: Session Management */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          <button onClick={onLogout} className="w-full bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-red-200 transition flex justify-center items-center gap-2">
            👋 Komplett abmelden
          </button>
        </div>
      </div>
    </>
  );
};