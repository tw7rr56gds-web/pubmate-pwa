import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';

// --- CLIENT-SIDE COMPUTATION ---
// Haversine-Formel zur clientseitigen Berechnung der Luftlinien-Distanz zwischen zwei Koordinaten.
// Entlastet das Backend, da die Filterung lokal im Browser (Edge Computing Ansatz) stattfindet.
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Erdradius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const Events = ({ user, activeLocation, radius }) => {
  // --- REACTIVE STATE MANAGEMENT ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MBAAS INTEGRATION: REALTIME DATABASE ---
  useEffect(() => {
    // Erstellt eine Query, die alle Events chronologisch sortiert abruft
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    
    // onSnapshot baut eine WebSocket-Verbindung (Realtime) zum Firebase Backend auf.
    // Die UI aktualisiert sich vollautomatisch in Echtzeit, sobald sich Daten in der DB ändern.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsData);
      setLoading(false);
    });
    
    // Cleanup-Funktion: Schließt die WebSocket-Verbindung, wenn die Komponente unmountet
    return () => unsubscribe();
  }, []);

  // --- DATABASE WRITE OPERATIONS (ATOMIC) ---
  // Treffen beitreten: Nutzt arrayUnion für atomare Transaktionen, 
  // um Überschreibungen bei gleichzeitigen Zugriffen zu verhindern.
  const handleJoin = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { teilnehmer: arrayUnion(user.uid) });
    } catch (error) {
      alert("Fehler beim Beitreten: " + error.message);
    }
  };

  // Als Gast vom Treffen abmelden: Nutzt arrayRemove
  const handleLeave = async (eventId) => {
    try {
      await updateDoc(doc(db, "events", eventId), { teilnehmer: arrayRemove(user.uid) });
    } catch (error) {
      alert("Fehler beim Abmelden: " + error.message);
    }
  };

  // Als Veranstalter das Treffen komplett absagen/löschen
  const handleDelete = async (eventId) => {
    const confirmDelete = window.confirm("Willst du dieses Treffen wirklich absagen und komplett löschen?");
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (error) {
      alert("Fehler beim Absagen: " + error.message);
    }
  };

  // --- DATA FILTERING ---
  // Lokales Filtern der aus dem Backend geladenen Events basierend auf dem GPS-Radius
  const filteredEvents = events.filter(event => {
    if (!activeLocation || !event.latitude || !event.longitude) return false; 
    const distance = getDistanceInKm(activeLocation.latitude, activeLocation.longitude, event.latitude, event.longitude);
    event.distance = distance.toFixed(1); 
    return distance <= radius;
  });

  // --- DECLARATIVE UI RENDERING ---
  // Ladezustand anzeigen
  if (loading) return <p className="text-gray-500 text-center py-4 animate-pulse">Lade Treffen...</p>;

  // Fallback-UI, wenn im gewählten Radius keine Events existieren
  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <span className="text-3xl mb-2 block">🏜️</span>
        <p className="text-gray-500 font-bold">Hier ist noch nichts los!</p>
      </div>
    );
  }

  // Map-Funktion zur Generierung der Event-Liste
  return (
    <div className="space-y-4">
      {filteredEvents.map(event => {
        // Lokale Status-Auswertung für das Conditional Rendering der Buttons
        const isCreator = event.creatorId === user.uid;
        const isParticipating = event.teilnehmer?.includes(user.uid);
        const isFull = event.teilnehmer?.length >= event.maxPersonen;

        return (
          <div key={event.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition">
            
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {event.creatorPic ? (
                  <img 
                    src={event.creatorPic} 
                    alt="Creator" 
                    loading="lazy" /* Progressive Enhancement: First Meaningful Paint optimieren */
                    className="w-10 h-10 rounded-full object-cover shadow-sm" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold shadow-sm">
                    {event.creatorName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-800 text-sm">{event.motto}</p>
                  <p className="text-xs text-gray-500">von @{event.creatorName}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-orange-100 text-orange-700 text-xs font-black px-2 py-1.5 rounded-lg border border-orange-200">
                  {event.distance} km
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600 space-y-1.5 border border-gray-100">
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
            </div>

            {/* ACTION BUTTONS LOGIK: Progressive Anpassung der UI an den Nutzerstatus */}
            <div className="flex gap-2">
              {isCreator ? (
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 border border-red-200 shadow-sm hover:bg-red-100"
                >
                  🗑️ Treffen absagen
                </button>
              ) : isParticipating ? (
                <button 
                  onClick={() => handleLeave(event.id)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 border border-gray-200 shadow-sm hover:bg-gray-200"
                >
                  ❌ Ich komme doch nicht
                </button>
              ) : (
                <button 
                  onClick={() => handleJoin(event.id)}
                  disabled={isFull}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-sm ${isFull ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'}`}
                >
                  {isFull ? 'Leider schon voll' : 'Ich bin dabei! 🍻'}
                </button>
              )}
            </div>
            
          </div>
        );
      })}
    </div>
  );
};