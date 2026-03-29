import React, { useState } from 'react';
import { auth, db } from '../firebase'; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const AuthScreen = () => {
  // --- REACTIVE STATE MANAGEMENT ---
  // Verwaltung der Formular-Eingaben
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [benutzername, setBenutzername] = useState('');
  
  // Verwaltung der UI-Zustände (Ladebildschirm, Fehler, Modus-Wechsel)
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [infoMessage, setInfoMessage] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);

  // --- MBAAS INTEGRATION: FIREBASE AUTH & FIRESTORE ---
  // Zentraler Handler für Registrierung und Login
  const handleAuth = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setAuthError('');
    setInfoMessage('');
    
    try {
      if (isRegistering) {
        // SECURITY CHECK: Client-seitige Passwort-Validierung vor dem Backend-Call
        // Erzwingt hohe Passwortkomplexität (min. 12 Zeichen, Großbuchstabe, Sonderzeichen)
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
        if (!passwordRegex.test(password)) {
          setAuthError("Sicherheit geht vor! Das Passwort muss mindestens 12 Zeichen, 1 Großbuchstaben und 1 Sonderzeichen enthalten.");
          setIsLoading(false);
          return;
        }

        // 1. Nutzer im Firebase Auth Backend anlegen
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // 2. Double-Opt-In: Verifizierungs-E-Mail senden
        await sendEmailVerification(newUser);
        
        // 3. Nutzerprofil in der Firestore Datenbank (NoSQL) anlegen
        // Verknüpfung der Auth-UID mit den Profil-Metadaten
        await setDoc(doc(db, "users", newUser.uid), {
          vorname,
          nachname,
          benutzername,
          email,
          registriertAm: serverTimestamp(),
        });
        setInfoMessage('Account erstellt! Bitte prüfe deine E-Mails zur Bestätigung.');
      } else {
        // Login-Flow
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      // UX-Optimierung: Technische Firebase-Fehlercodes in nutzerfreundliche Meldungen übersetzen
      if (err.code === 'auth/email-already-in-use') {
        setAuthError("Diese E-Mail wird bereits verwendet.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setAuthError("Falsche E-Mail oder falsches Passwort.");
      } else {
        setAuthError(`Ein Fehler ist aufgetreten: ${err.code}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- RE-ENGAGEABILITY / UX ---
  // Ermöglicht das Zurücksetzen des Passworts über das Firebase Auth Backend
  const handlePasswordReset = async () => {
    if (!email) {
      setAuthError('Bitte gib zuerst deine E-Mail-Adresse oben ein.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage('Link gesendet! Bitte prüfe deine E-Mails.');
      setAuthError('');
    } catch (err) {
      setAuthError(`Fehlercode: ${err.code}`);
    }
  };

  // --- DECLARATIVE UI RENDERING ---
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl">
      <h2 className="text-xl font-bold mb-2 text-gray-800 text-center">
        {isRegistering ? 'Neu bei PubMate?' : 'Willkommen zurück!'}
      </h2>
      <p className="text-gray-500 mb-6 text-center text-sm">
        Finde Leute in deiner Nähe, die auch nicht gern alleine trinken.
      </p>
      
      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        {/* Conditional Rendering: Zusätzliche Felder nur bei Registrierung anzeigen */}
        {isRegistering && (
          <>
            <div className="flex gap-3">
              <input type="text" placeholder="Vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} className="w-1/2 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" required />
              <input type="text" placeholder="Nachname" value={nachname} onChange={(e) => setNachname(e.target.value)} className="w-1/2 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" required />
            </div>
            <input type="text" placeholder="Benutzername" value={benutzername} onChange={(e) => setBenutzername(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" required />
          </>
        )}

        <input type="email" placeholder="E-Mail Adresse" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" required />
        
        <input 
          type="password" 
          placeholder={isRegistering ? "Passwort (min. 12 Zeichen, inkl. Groß- & Sonderzeichen)" : "Passwort"} 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" 
          required 
        />

        {!isRegistering && (
          <div className="text-right mt-[-5px]">
            <button type="button" onClick={handlePasswordReset} className="text-sm text-gray-500 hover:text-orange-500 font-medium transition">Passwort vergessen?</button>
          </div>
        )}
        
        {/* Visuelles Feedback für den Nutzer */}
        {authError && <p className="text-red-500 text-sm text-center font-bold">{authError}</p>}
        {infoMessage && <p className="text-green-600 text-sm text-center font-bold">{infoMessage}</p>}
        
        {/* Dynamischer Button-Status (Lade-Indikator verhindert Doppel-Klicks) */}
        <button type="submit" disabled={isLoading} className={`w-full text-white font-bold py-3 rounded-xl shadow-md transition ${isLoading ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'}`}>
          {isLoading ? 'Lädt...' : (isRegistering ? 'Konto erstellen' : 'Einloggen')}
        </button>
      </form>

      {/* Toggle zwischen Login- und Registrierungs-Modus */}
      <div className="mt-6 text-center">
        <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setInfoMessage(''); }} className="text-orange-500 text-sm font-semibold hover:underline">
          {isRegistering ? 'Ich habe schon ein Konto' : 'Noch kein Konto? Hier registrieren'}
        </button>
      </div>
    </div>
  );
};