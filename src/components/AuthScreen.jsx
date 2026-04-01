import React, { useState } from 'react';
import { auth, db } from '../firebase'; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @component AuthScreen
 * @description Zentrale Komponente für das Identitäts- und Zugriffsmanagement (IAM).
 * Implementiert die Authentifizierungs-Logik (Login, Registrierung, Passwort-Reset) 
 * über das Firebase MBaaS-Backend und steuert die deklarative Benutzeroberfläche 
 * auf Basis des lokalen React-States.
 */
export const AuthScreen = () => {
  
  // --- LOKALES STATE MANAGEMENT (React Hooks) ---
  // Kapselung der Formular-Entitäten für den kontrollierten Datenfluss (Controlled Components)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [benutzername, setBenutzername] = useState('');
  
  // Verwaltung der asynchronen UI-Zustände (Graceful Degradation & User Feedback)
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [infoMessage, setInfoMessage] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);

  // --- MBaaS INTEGRATION: FIREBASE AUTH & FIRESTORE ---
  /**
   * Asynchroner Handler für den Authentifizierungs-Lebenszyklus.
   * Nutzt async/await zur synchron wirkenden Behandlung von Promises (gemäß ES6+ Standards).
   */
  const handleAuth = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setAuthError('');
    setInfoMessage('');
    
    try {
      if (isRegistering) {
        // SECURITY CHECK (Defense in Depth): Client-seitige Validierung der Passwortkomplexität, 
        // bevor teure Backend-Calls ausgeführt werden.
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
        if (!passwordRegex.test(password)) {
          setAuthError("Sicherheitsrichtlinie: Min. 12 Zeichen, 1 Großbuchstabe und 1 Sonderzeichen.");
          setIsLoading(false);
          return;
        }

        // 1. Identitätsbereitstellung: Nutzer im Firebase Auth Backend anlegen
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // 2. Verifizierung: Double-Opt-In Prozess anstoßen (Sicherheitsstandard)
        await sendEmailVerification(newUser);
        
        // 3. Daten-Synchronisation: Verknüpfung der Auth-UID mit dem Firestore-Nutzerdokument
        await setDoc(doc(db, "users", newUser.uid), {
          vorname,
          nachname,
          benutzername,
          email,
          registriertAm: serverTimestamp(),
        });
        
        setInfoMessage('Account erfolgreich generiert. Bitte bestätige deine E-Mail-Adresse.');
      } else {
        // Standard-Login-Flow
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      // UX-OPTIMIERUNG: Mapping technischer Provider-Fehlercodes in verständliche Nutzer-Feedbacks
      switch (err.code) {
        case 'auth/email-already-in-use':
          setAuthError("Diese E-Mail-Adresse ist bereits im System registriert.");
          break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setAuthError("Authentifizierung fehlgeschlagen: Zugangsdaten inkorrekt.");
          break;
        case 'auth/too-many-requests':
          setAuthError("Zu viele Fehlversuche. Bitte versuche es später erneut.");
          break;
        default:
          setAuthError("Ein unerwarteter Kommunikationsfehler ist aufgetreten.");
          console.error("Auth-Error:", err); // Logging für Development
      }
    } finally {
      setIsLoading(false); // Garantiert die Freigabe des UIs, unabhängig vom Promise-Ergebnis
    }
  };

  // --- ACCOUNT RECOVERY ---
  /**
   * Triggert den Passwort-Reset-Prozess via Firebase Auth.
   */
  const handlePasswordReset = async () => {
    if (!email) {
      setAuthError('Für den Passwort-Reset wird eine E-Mail-Adresse benötigt.');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage('Wiederherstellungs-Link versendet. Bitte prüfe dein Postfach.');
      setAuthError('');
    } catch (err) {
      // Abfangen spezifischer Reset-Fehler
      if (err.code === 'auth/user-not-found') {
        setAuthError('Zu dieser E-Mail existiert kein aktiver Account.');
      } else {
        setAuthError('Fehler beim Zurücksetzen des Passworts. Bitte E-Mail prüfen.');
      }
    }
  };

  // --- DECLARATIVE UI RENDERING ---
  // Nutzung von JSX zur deklarativen Beschreibung der UI basierend auf dem aktuellen State.
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md mx-auto">
      <header className="mb-6 text-center">
        <h2 className="text-xl font-bold mb-2 text-gray-800">
          {isRegistering ? 'Neu bei PubMate?' : 'Willkommen zurück!'}
        </h2>
        <p className="text-gray-500 text-sm">
          Standortbasiert Leute finden, die auch nicht gern alleine anstoßen.
        </p>
      </header>
      
      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        
        {/* CONDITIONAL RENDERING: Dynamischer Formularaufbau basierend auf dem Modus */}
        {isRegistering && (
          <fieldset className="flex flex-col gap-4 border-none p-0 m-0">
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Vorname" 
                value={vorname} 
                onChange={(e) => setVorname(e.target.value)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-shadow" 
                required 
              />
              <input 
                type="text" 
                placeholder="Nachname" 
                value={nachname} 
                onChange={(e) => setNachname(e.target.value)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-shadow" 
                required 
              />
            </div>
            <input 
              type="text" 
              placeholder="Benutzername" 
              value={benutzername} 
              onChange={(e) => setBenutzername(e.target.value)} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-shadow" 
              required 
            />
          </fieldset>
        )}

        <input 
          type="email" 
          placeholder="E-Mail-Adresse" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-shadow" 
          required 
        />
        
        <input 
          type="password" 
          placeholder={isRegistering ? "Passwort (min. 12 Zeichen)" : "Passwort"} 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-shadow" 
          required 
        />

        {/* Passwort-Reset Option nur im Login-Modus rendern */}
        {!isRegistering && (
          <div className="text-right mt-[-5px]">
            <button 
              type="button" 
              onClick={handlePasswordReset} 
              className="text-sm text-gray-500 hover:text-orange-500 font-medium transition-colors"
            >
              Passwort vergessen?
            </button>
          </div>
        )}
        
        {/* User-Feedback Rendering (Fehler & Erfolgsmeldungen) */}
        {authError && (
          <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
            <p className="text-red-500 text-xs text-center font-bold">{authError}</p>
          </div>
        )}
        
        {infoMessage && (
          <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
            <p className="text-green-600 text-xs text-center font-bold">{infoMessage}</p>
          </div>
        )}
        
        {/* Submit-Action mit Lade-Indikator (verhindert Race-Conditions durch Doppel-Klicks) */}
        <button 
          type="submit" 
          disabled={isLoading} 
          className={`w-full text-white font-bold py-3 rounded-xl shadow-md transition-all mt-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg active:scale-95'}`}
        >
          {isLoading ? 'Verbindung wird aufgebaut...' : (isRegistering ? 'Account generieren' : 'Sicher einloggen')}
        </button>
      </form>

      {/* State-Toggle für UI-Moduswechsel */}
      <footer className="mt-8 text-center pt-4 border-t border-gray-100">
        <button 
          type="button" 
          onClick={() => { 
            setIsRegistering(!isRegistering); 
            setAuthError(''); 
            setInfoMessage(''); 
          }} 
          className="text-orange-500 text-sm font-semibold hover:underline transition-all"
        >
          {isRegistering ? 'Ich besitze bereits einen Account' : 'Noch kein Account? Hier registrieren'}
        </button>
      </footer>
    </div>
  );
};