import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { useLocation } from './hooks/useLocation';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { Events } from './components/Events'; 
import { CreateEvent } from './components/CreateEvent';

/**
 * @component App
 * @description Root-Komponente und zentraler Orchestrator der Progressive Web App (PWA).
 * Verwaltet den globalen State, das bedingte SPA-Routing (Single Page Application)
 * und die Anbindung an die Mobile Backend as a Service (MBaaS) Infrastruktur.
 */
function App() {
  
  // --- REACTIVE STATE MANAGEMENT ---
  // Verwaltung des globalen Anwendungszustands zur synchronen UI-Aktualisierung
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // --- NATIVE DEVICE APIs & LOCATION SERVICES ---
  // Einbindung des benutzerdefinierten Hooks für Hardware-Sensoren (Geolocation API)
  const { location: gpsLocation, error: locError, isLoading: locLoading } = useLocation();
  
  // Verwaltung des logischen Suchradius und der aktiven Kartenposition
  const [activeLocation, setActiveLocation] = useState(null); 
  const [searchCity, setSearchCity] = useState("");
  const [radius, setRadius] = useState(5); 

  // --- MBaaS: IDENTITY & ACCESS MANAGEMENT (IAM) ---
  /**
   * Observer-Pattern: Überwacht den Authentifizierungsstatus in Echtzeit.
   * Baut einen persistenten Listener zum Firebase-Backend auf und synchronisiert 
   * die lokale UI sofort, wenn der Nutzer sich einloggt, abmeldet oder das Token abläuft.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      setUser(authenticatedUser);
      
      if (authenticatedUser) {
        try {
          // Asynchrones Fetching des erweiterten Nutzerprofils aus der NoSQL-Datenbank
          const docSnap = await getDoc(doc(db, "users", authenticatedUser.uid));
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Datenbank-Fehler beim Abrufen des Nutzerprofils:", error);
        }
      } else {
        // State-Bereinigung bei abgemeldeten Nutzern
        setUserData(null);
      }
    });
    
    // Memory Leak Prevention: Cleanup des Listeners beim Unmounten der App
    return () => unsubscribe();
  }, []);

  // --- STATE SYNCHRONIZATION ---
  // Initialisiert die App-Location mit den Hardware-GPS-Daten, sobald diese vorliegen
  useEffect(() => {
    if (gpsLocation && !activeLocation) {
      setActiveLocation(gpsLocation);
    }
  }, [gpsLocation, activeLocation]);

  // --- EXTERNAL APIs: FORWARD-GEOCODING ---
  /**
   * Nutzt die REST-API von OpenStreetMap (Nominatim) zur Umwandlung von 
   * textuellen Ortsnamen in numerische Koordinaten (Forward-Geocoding).
   */
  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    
    try {
      // Sicheres URL-Encoding der Nutzereingabe zur Vermeidung von Request-Fehlern
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchCity)}`);
      if (!response.ok) throw new Error("Geocoding API aktuell nicht erreichbar.");
      
      const data = await response.json();
      
      if (data.length > 0) {
        setActiveLocation({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          name: data[0].display_name.split(',')[0] // Extrahiert nur den primären Stadtnamen
        });
        setSearchCity("");
      } else {
        alert("Validierungsfehler: Die gesuchte Stadt konnte topografisch nicht aufgelöst werden.");
      }
    } catch (err) {
      // Graceful Degradation bei externen API-Ausfällen
      console.error("Fehler bei der Stadtsuche:", err);
      alert("Netzwerkfehler: Die Ortssuche ist momentan nicht verfügbar.");
    }
  };

  /**
   * Sichere Terminierung der Nutzersession im IAM-Backend.
   */
  const handleLogout = () => {
    signOut(auth);
    setIsSettingsOpen(false);
  };

  // --- COMPONENT TREE & DECLARATIVE UI ---
  // Nutzt Tailwind CSS für Responsive Web Design nach dem "Mobile-First"-Ansatz
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 relative overflow-x-hidden pb-20">
      
      {/* App-Header mit dynamischem User-Feedback */}
      <header className="w-full max-w-md flex justify-between items-center mb-6 mt-4 z-10">
        <h1 className="text-3xl font-black text-orange-500 tracking-tighter">PubMate 🍻</h1>
        
        {/* Conditional Rendering: Profil-Interface nur für authentifizierte Nutzer */}
        {user && userData && (
          <nav className="flex items-center gap-3">
            {userData.profilbild_url ? (
              <img 
                src={userData.profilbild_url} 
                alt="Nutzerprofil" 
                loading="lazy" /* PROGRESSIVE ENHANCEMENT: Optimiert die Time-to-Interactive (TTI) */
                className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 shadow-sm" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-orange-200 shadow-sm">
                {userData.benutzername?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className="text-2xl hover:scale-110 transition-transform bg-white p-1 rounded-full shadow-sm" 
              aria-label="Einstellungen öffnen"
            >
              ⚙️
            </button>
          </nav>
        )}
      </header>

      {/* COMPONENT COMPOSITION: Auslagerung komplexer Logik in Sub-Komponenten (Separation of Concerns) */}
      {user && (
        <Sidebar 
          user={user} 
          userData={userData} 
          setUserData={setUserData} 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onLogout={handleLogout} 
        />
      )}

      {/* Hauptinhaltsbereich */}
      <main className="w-full max-w-md space-y-6">
        
        {/* SPA-ROUTING: Login-Screen vs. Authentifiziertes User-Dashboard */}
        {!user ? (
          <AuthScreen />
        ) : (
          <>
            {/* Dashboard Welcome Card */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border-l-4 border-orange-400">
              <h2 className="text-2xl font-black text-gray-800">
                Gude, {userData?.vorname || 'Kumpel'}! 👋
              </h2>
              <p className="text-gray-500 text-sm mt-1">Lass uns jemanden zum Anstoßen finden.</p>
            </section>

            {/* Location Dashboard: Dynamische Steuerung von Geodaten und Suchradius */}
            <section className="bg-white p-5 rounded-3xl shadow-md border-2 border-orange-100">
              <div className="flex flex-col gap-4">
                
                {/* Geocoding Formular */}
                <form onSubmit={handleCitySearch} className="relative">
                  <input 
                    type="text" 
                    placeholder="Andere Stadt suchen... (z.B. Frankfurt)" 
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full bg-gray-100 border-none rounded-xl py-3 px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
                  />
                  <button type="submit" className="absolute right-3 top-2.5 text-xl" aria-label="Suchen">🔍</button>
                </form>

                {/* Filter-Logik: Radius-Steuerung */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Umkreis:</span>
                  <div className="flex gap-2">
                    {[1, 2, 5, 10].map((r) => (
                      <button 
                        key={r} 
                        onClick={() => setRadius(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${radius === r ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visuelles Feedback zum aktiven Standort */}
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <span className="text-lg" role="img" aria-label="Standort">📍</span>
                  <div className="flex-1">
                    {locLoading ? (
                       <p className="animate-pulse text-orange-400 font-medium">Hardware-Sensor sucht Standort...</p>
                    ) : (
                      <p>Zeige Treffen in <span className="font-bold text-orange-600">{activeLocation?.name || "deiner Nähe"}</span></p>
                    )}
                  </div>
                  {/* Fallback auf nativen GPS-Sensor */}
                  <button 
                    onClick={() => setActiveLocation(gpsLocation)} 
                    className="text-xs text-blue-600 underline font-medium hover:text-blue-800"
                  >
                    GPS nutzen
                  </button>
                </div>
              </div>
            </section>

            {/* Action Trigger: Modal für Dateneingabe öffnen */}
            <button 
              onClick={() => setShowCreateEvent(true)}
              className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-orange-600 transition-all transform hover:scale-[1.02] active:scale-95"
            >
              + Neues Treffen planen
            </button>

            {/* Daten-Ansicht: Realtime Event Feed */}
            <section className="bg-white p-6 rounded-3xl shadow-md">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Geplante Treffen</h3>
              <Events 
                user={user} 
                activeLocation={activeLocation} 
                radius={radius} 
              />
            </section>
          </>
        )}
      </main>

      {/* Modal Overlay: Entkoppelte Ansicht zur Event-Generierung */}
      {showCreateEvent && (
        <CreateEvent 
          user={user} 
          userData={userData} 
          location={activeLocation}
          onClose={() => setShowCreateEvent(false)} 
        />
      )}
    </div>
  );
}

export default App;