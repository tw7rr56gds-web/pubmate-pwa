import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { useLocation } from './hooks/useLocation';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { Events } from './components/Events'; 
import { CreateEvent } from './components/CreateEvent';

function App() {
  // --- STATE MANAGEMENT ---
  // Verwaltung des globalen Anwendungszustands (Reactivity)
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // --- LOCATION SERVICES ---
  // Einbindung des benutzerdefinierten Location-Hooks für native Gerätefunktionen
  const { location: gpsLocation, error: locError, isLoading: locLoading } = useLocation();
  const [activeLocation, setActiveLocation] = useState(null); 
  const [searchCity, setSearchCity] = useState("");
  const [radius, setRadius] = useState(5); 

  // --- EFFECT HOOKS ---
  // Überwacht den Authentifizierungsstatus des Nutzers über Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Lädt zusätzliche Nutzerdaten (z.B. Profilbild, Name) asynchron aus Firestore
        const docSnap = await getDoc(doc(db, "users", u.uid));
        if (docSnap.exists()) setUserData(docSnap.data());
      } else {
        setUserData(null);
      }
    });
    // Cleanup-Funktion zum Beenden des Listeners beim Unmounten
    return () => unsubscribe();
  }, []);

  // Synchronisiert die aktive Such-Location initial mit den echten GPS-Daten
  useEffect(() => {
    if (gpsLocation && !activeLocation) {
      setActiveLocation(gpsLocation);
    }
  }, [gpsLocation, activeLocation]);

  // --- HANDLER FUNCTIONS ---
  // Nutzt die Nominatim API (OpenStreetMap) für Geocoding (Stadtname zu Koordinaten)
  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!searchCity) return;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchCity}`);
      const data = await response.json();
      
      if (data.length > 0) {
        setActiveLocation({
          latitude: parseFloat(data[0].lat).toFixed(4),
          longitude: parseFloat(data[0].lon).toFixed(4),
          name: data[0].display_name.split(',')[0]
        });
        setSearchCity("");
      } else {
        alert("Stadt nicht gefunden.");
      }
    } catch (err) {
      console.error("Fehler bei der Stadtsuche:", err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsSettingsOpen(false);
  };

  // --- DECLARATIVE UI RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 relative overflow-x-hidden pb-20">
      
      <header className="w-full max-w-md flex justify-between items-center mb-6 mt-4 z-10">
        <h1 className="text-3xl font-black text-orange-500 tracking-tighter">PubMate 🍻</h1>
        
        {/* Conditional Rendering: Zeigt Profil-Infos nur an, wenn Daten geladen sind */}
        {user && userData && (
          <div className="flex items-center gap-3">
            {userData.profilbild_url ? (
              <img 
                src={userData.profilbild_url} 
                alt="Profil" 
                loading="lazy" /* Progressive Enhancement: Verzögertes Laden von Bildern */
                className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 shadow-sm" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-orange-200 shadow-sm">
                {userData.benutzername?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="text-2xl hover:scale-110 transition-transform bg-white p-1 rounded-full shadow-sm" title="Einstellungen">
              ⚙️
            </button>
          </div>
        )}
      </header>

      {/* Externe Sidebar-Komponente für Einstellungen und Sicherheit */}
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

      <main className="w-full max-w-md space-y-6">
        {/* Conditional Rendering: Switch zwischen Login-Screen und Haupt-Dashboard */}
        {!user ? (
          <AuthScreen />
        ) : (
          <>
            <div className="bg-white p-6 rounded-3xl shadow-sm border-l-4 border-orange-400">
              <h2 className="text-2xl font-black text-gray-800">
                Gude, {userData?.vorname || 'Kumpel'}! 👋
              </h2>
              <p className="text-gray-500 text-sm mt-1">Lass uns jemanden zum Anstoßen finden.</p>
            </div>

            {/* Location Dashboard: Formular zur Steuerung des Daten-Feeds */}
            <div className="bg-white p-5 rounded-3xl shadow-md border-2 border-orange-100">
              <div className="flex flex-col gap-4">
                
                <form onSubmit={handleCitySearch} className="relative">
                  <input 
                    type="text" 
                    placeholder="Andere Stadt suchen... (z.B. Frankfurt)" 
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full bg-gray-100 border-none rounded-xl py-3 px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button type="submit" className="absolute right-3 top-2.5 text-xl">🔍</button>
                </form>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Umkreis:</span>
                  <div className="flex gap-2">
                    {[1, 2, 5, 10].map((r) => (
                      <button 
                        key={r} 
                        onClick={() => setRadius(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${radius === r ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <span className="text-lg">📍</span>
                  <div className="flex-1">
                    {locLoading ? (
                       <p className="animate-pulse text-orange-400">Suche Standort...</p>
                    ) : (
                      <p>Zeige Treffen in <span className="font-bold text-orange-600">{activeLocation?.name || "deiner Nähe"}</span></p>
                    )}
                  </div>
                  <button onClick={() => setActiveLocation(gpsLocation)} className="text-xs text-blue-600 underline">GPS nutzen</button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowCreateEvent(true)}
              className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-orange-600 transition transform hover:scale-[1.02]"
            >
              + Neues Treffen planen
            </button>

            {/* Zentrale Event-Feed-Komponente */}
            <div className="bg-white p-6 rounded-3xl shadow-md">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Geplante Treffen</h3>
              <Events 
                user={user} 
                activeLocation={activeLocation} 
                radius={radius} 
              />
            </div>
          </>
        )}
      </main>

      {/* Überlagertes Modal zum Erstellen von neuen Events */}
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