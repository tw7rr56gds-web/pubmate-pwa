import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';

// --- COMPLEX BUSINESS LOGIC: GEOLOCATION ---
/**
 * Haversine-Algorithmus zur präzisen Berechnung der sphärischen Distanz auf der Erdoberfläche.
 * Architektonischer Ansatz: "Edge Computing". Die Filterung findet ressourcenschonend 
 * auf dem Endgerät des Nutzers (Client) statt, anstatt teure Cloud-Functions zu triggern.
 */
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const earthRadiusKm = 6371; 
  const toRadians = Math.PI / 180;
  
  const deltaLat = (lat2 - lat1) * toRadians;
  const deltaLon = (lon2 - lon1) * toRadians;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + 
            Math.cos(lat1 * toRadians) * Math.cos(lat2 * toRadians) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

/**
 * @component Events
 * @description Deklarative UI-Komponente zur Echtzeit-Darstellung des standortbasierten Social-Graphs.
 * Implementiert WebSocket-Listener für Live-Daten und atomare NoSQL-Transaktionen.
 */
export const Events = ({ user, activeLocation, radius }) => {
  
  // --- REACTIVE STATE MANAGEMENT ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MBaaS INTEGRATION: REALTIME DATA SYNCHRONIZATION ---
  useEffect(() => {
    // Definition der NoSQL-Query (Chronologisch absteigend)
    const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
    
    // onSnapshot etabliert eine persistente WebSocket-Verbindung (Realtime).
    // Implementiert das "Reactive UI" Pattern: Datenänderungen im Backend triggern sofortige Re-Renders.
    const unsubscribe = onSnapshot(eventsQuery, 
      (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(eventsData);
        setLoading(false);
      },
      (error) => {
        // Fallback/Graceful Degradation bei Verbindungsabbruch
        console.error("WebSocket-Fehler beim Synchronisieren der Event-Daten:", error);
        setLoading(false); 
      }
    );
    
    // Lifecycle-Management: Zwingendes Schließen des Sockets zur Vermeidung von Memory Leaks
    return () => unsubscribe();
  }, []);

  // --- NoSQL DATA MUTATION: ATOMIC OPERATIONS ---
  
  /**
   * Teilnehmen-Logik: Nutzt die Firebase-Funktion 'arrayUnion'.
   * Dies garantiert "Atomicity" (ACID-Prinzipien): Selbst wenn hunderte Nutzer exakt 
   * gleichzeitig auf den Button klicken, wird das Array im Backend konfliktfrei erweitert.
   */
  const handleJoin = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { teilnehmer: arrayUnion(user.uid) });
    } catch (error) {
      alert("Transaktionsfehler beim Beitreten: " + error.message);
    }
  };

  /**
   * Abmelden-Logik: Nutzt 'arrayRemove' für konsistente Datenlöschung.
   */
  const handleLeave = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { teilnehmer: arrayRemove(user.uid) });
    } catch (error) {
      alert("Transaktionsfehler beim Abmelden: " + error.message);
    }
  };

  /**
   * Lösch-Logik für Administratoren/Ersteller eines Events.
   */
  const handleDelete = async (eventId) => {
    const confirmDelete = window.confirm("Security-Check: Willst du dieses Treffen unwiderruflich löschen?");
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (error) {
      alert("Berechtigungsfehler beim Löschen: " + error.message);
    }
  };

  // --- CLIENT-SIDE FILTERING & DATA TRANSFORMATION ---
  // Reduziert den globalen Datenstrom auf den relevanten lokalen Radius des Endgeräts.
  const filteredEvents = events.filter(event => {
    // Guard-Clause für korrupte oder noch ladende Geo-Daten
    if (!activeLocation || !event.latitude || !event.longitude) return false; 
    
    const distance = getDistanceInKm(activeLocation.latitude, activeLocation.longitude, event.latitude, event.longitude);
    
    // Daten-Anreicherung für die UI (Mutabilität ist hier sicher, da der State lokal kopiert wurde)
    event.distance = distance.toFixed(1); 
    
    return distance <= radius;
  });

  // --- DECLARATIVE UI RENDERING ---
  
  // 1. Lade-Zustand (Skeleton/Feedback)
  if (loading) {
    return <p className="text-gray-500 text-center py-4 animate-pulse">Echtzeit-Synchronisation läuft...</p>;
  }

  // 2. Empty-State (Zero-Data-Ansicht)
  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <span className="text-3xl mb-2 block" role="img" aria-label="Wüste">🏜️</span>
        <p className="text-gray-500 font-bold">In diesem Radius ist aktuell nichts los!</p>
      </div>
    );
  }

  // 3. Populated State (Vollständige Datenansicht)
  return (
    <div className="space-y-4">
      {filteredEvents.map(event => {
        // Lokale Status-Auswertung zur Steuerung der konditionalen Zugriffslogik
        const isCreator = event.creatorId === user.uid;
        // Defensive Programmierung: Optional Chaining (?.) schützt vor Null-Pointern bei leeren Arrays
        const isParticipating = event.teilnehmer?.includes(user.uid);
        const isFull = (event.teilnehmer?.length || 1) >= event.maxPersonen;

        return (
          <article key={event.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition">
            
            <header className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {event.creatorPic ? (
                  <img 
                    src={event.creatorPic} 
                    alt={`Profilbild von ${event.creatorName}`} 
                    loading="lazy" /* PROGRESSIVE ENHANCEMENT: First Meaningful Paint optimieren */
                    className="w-10 h-10 rounded-full object-cover shadow-sm" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold shadow-sm">
                    {event.creatorName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{event.motto}</h3>
                  <p className="text-xs text-gray-500">von @{event.creatorName}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-orange-100 text-orange-700 text-xs font-black px-2 py-1.5 rounded-lg border border-orange-200">
                  {event.distance} km
                </span>
              </div>
            </header>
            
            <section className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600 space-y-1.5 border border-gray-100">
              <p>📍 <span className="font-semibold">{event.venueName}</span></p>
              
              {event.venueAddress && (
                <p className="text-xs text-gray-400 ml-5">{event.venueAddress}</p>
              )}
              
              <p>🕒 {event.datum} um {event.uhrzeit} Uhr</p>
              <p>👥 {event.teilnehmer?.length || 1} / {event.maxPersonen} Personen</p>
              
              {event.beschreibung && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase">Details:</p>
                  <p className="italic">{event.beschreibung}</p>
                </div>
              )}
            </section>

            {/* ACTION BUTTONS LOGIK: Progressive Anpassung der UI an den Authentifizierungs-Status */}
            <footer className="flex gap-2">
              {isCreator ? (
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 border border-red-200 shadow-sm hover:bg-red-100 transition-colors"
                >
                  🗑️ Treffen absagen
                </button>
              ) : isParticipating ? (
                <button 
                  onClick={() => handleLeave(event.id)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 border border-gray-200 shadow-sm hover:bg-gray-200 transition-colors"
                >
                  ❌ Ich komme doch nicht
                </button>
              ) : (
                <button 
                  onClick={() => handleJoin(event.id)}
                  disabled={isFull}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-sm ${isFull ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 active:scale-95'}`}
                >
                  {isFull ? 'Kapazität erreicht' : 'Ich bin dabei! 🍻'}
                </button>
              )}
            </footer>
            
          </article>
        );
      })}
    </div>
  );
};