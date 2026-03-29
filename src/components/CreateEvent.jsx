import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const CreateEvent = ({ user, userData, location, onClose }) => {
  // --- REACTIVE STATE MANAGEMENT ---
  // UI-Zustände (Laden, Speichern)
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Formular-Zustände (Data Binding für die Eingabefelder)
  const [selectedVenue, setSelectedVenue] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState(''); 
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPeople, setMaxPeople] = useState('2');
  const [motto, setMotto] = useState('');
  const [description, setDescription] = useState(''); 
  const [venueCoords, setVenueCoords] = useState(null);

  // --- HELPER FUNCTIONS ---
  // Daten-Transformation: Extrahiert und formatiert die Adressdaten aus der OSM-API
  const formatAddress = (tags) => {
    const street = tags["addr:street"] || "";
    const houseNumber = tags["addr:housenumber"] || "";
    const postCode = tags["addr:postcode"] || "";
    const city = tags["addr:city"] || "";
    
    // Fallback, falls die Node/Way in OSM keine detaillierten Adress-Tags besitzt
    if (!street && !city) return "";
    return `${street} ${houseNumber}, ${postCode} ${city}`.trim();
  };

  // --- EFFECT HOOKS & API INTEGRATION ---
  // Asynchroner Fetch-Aufruf an die Overpass API, sobald der Standort (location) verfügbar ist
  useEffect(() => {
    if (!location || !location.latitude || !location.longitude) return;

    const fetchVenues = async () => {
      setLoadingVenues(true);
      try {
        // Overpass QL Query: Sucht nach Pubs/Bars/Restaurants im Umkreis von 3km
        const query = `[out:json][timeout:10];(node["amenity"~"pub|bar|restaurant"](around:3000,${location.latitude},${location.longitude});way["amenity"~"pub|bar|restaurant"](around:3000,${location.latitude},${location.longitude}););out center;`;
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await response.json();

        // Datenbereinigung und Mapping der API-Antwort auf unser lokales State-Format
        const validVenues = data.elements
          .filter(v => v.tags && v.tags.name)
          .map(v => ({ 
            id: v.id, 
            name: v.tags.name, 
            address: formatAddress(v.tags),
            lat: v.lat || (v.center ? v.center.lat : null),
            lon: v.lon || (v.center ? v.center.lon : null)
          }))
          // Duplikate filtern (falls eine Location als Node und Way existiert) und alphabetisch sortieren
          .filter((value, index, self) => index === self.findIndex((t) => t.name === value.name))
          .sort((a, b) => a.name.localeCompare(b.name));

        setVenues(validVenues);
        if (validVenues.length === 0) setSelectedVenue('manual');
      } catch (error) {
        // Graceful Degradation: Bei API-Fehler Fallback auf manuelle Eingabe
        console.error("Fehler beim Laden der Locations:", error);
        setVenues([]);
        setSelectedVenue('manual');
      } finally {
        setLoadingVenues(false);
      }
    };
    fetchVenues();
  }, [location]); // Dependency Array: Hook läuft erneut, wenn sich 'location' ändert

  // --- EVENT HANDLERS ---
  // Aktualisiert die Formularfelder automatisch basierend auf dem Dropdown
  const handleVenueChange = (e) => {
    const val = e.target.value;
    setSelectedVenue(val);
    
    if (val === 'manual') {
      // Reset für manuelle Freitexteingabe
      setVenueName('');
      setVenueAddress('');
      setVenueCoords(null);
    } else {
      // Auto-Fill der Felder mit den zwischengespeicherten API-Daten
      const selected = venues.find(v => v.id.toString() === val);
      setVenueName(selected.name);
      setVenueAddress(selected.address || ""); 
      setVenueCoords({ lat: selected.lat, lon: selected.lon });
    }
  };

  // --- MBAAS INTEGRATION: FIRESTORE (WRITE) ---
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    // Client-seitige Validierung
    if (!venueName || !date || !time || !motto) return alert("Bitte Name, Datum, Uhrzeit und Motto angeben!");

    setIsSaving(true);
    try {
      // Erstellt ein neues Dokument in der NoSQL-Collection "events"
      await addDoc(collection(db, "events"), {
        creatorId: user.uid,
        creatorName: userData.benutzername,
        creatorPic: userData.profilbild_url || null,
        venueName: venueName,
        venueAddress: venueAddress, 
        // Geolocation: Nutzt Bar-Koordinaten oder (bei manueller Eingabe) den aktuellen User-Standort
        latitude: venueCoords?.lat || location.latitude,
        longitude: venueCoords?.lon || location.longitude,
        datum: date,
        uhrzeit: time,
        maxPersonen: parseInt(maxPeople),
        teilnehmer: [user.uid], // Creator ist automatisch der erste Teilnehmer
        motto: motto,
        beschreibung: description, 
        createdAt: serverTimestamp(), // Backend-Timestamp für konsistente Sortierung
        status: "open"
      });
      onClose(); // Modal schließen nach erfolgreichem Speichern
    } catch (error) {
      alert("Fehler beim Erstellen: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DECLARATIVE UI RENDERING ---
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center p-4">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">Neues Treffen 🍻</h2>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          
          {/* Location Auswahl (API-Daten oder Manuell) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location wählen</label>
            <select 
              value={selectedVenue} 
              onChange={handleVenueChange}
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">{loadingVenues ? 'Suche...' : 'Wähle einen Ort'}</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              <option value="manual" className="font-bold text-orange-600">✏️ Eigene Location eingeben...</option>
            </select>
          </div>

          {/* Detaillierte Location-Eingabefelder (Auto-Filled oder User Input) */}
          <div className="space-y-3 p-3 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div>
              <label className="block text-xs font-bold text-orange-600 uppercase mb-1 text-[10px]">Name der Location</label>
              <input 
                type="text" 
                value={venueName} 
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="z.B. Sky Beach"
                className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-600 uppercase mb-1 text-[10px]">Genaue Adresse</label>
              <input 
                type="text" 
                value={venueAddress} 
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Straße, Hausnummer, PLZ & Ort"
                className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Datum & Uhrzeit (Flexbox Layout für nebeneinanderliegende Felder) */}
          <div className="flex gap-4 text-sm">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Datum</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl" />
            </div>
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Uhrzeit</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl" />
            </div>
          </div>

          {/* Slider für maximale Teilnehmerzahl */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-center">Max. Personen: <span className="text-orange-600 text-lg">{maxPeople}</span></label>
            <input type="range" min="2" max="15" value={maxPeople} onChange={(e) => setMaxPeople(e.target.value)} className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          </div>

          {/* Kurzbeschreibung / Motto */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Was hast du vor?</label>
            <input type="text" placeholder="z.B. Cornern, Fußball schauen..." value={motto} onChange={(e) => setMotto(e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl" />
          </div>

          {/* Ausführliche Details */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Details zum Treffen</label>
            <textarea 
              placeholder="Was ist genau geplant? Woran erkennt man dich?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 min-h-[80px]" 
            />
          </div>

          {/* Submit Button (mit Lade-Indikator zur UX-Verbesserung) */}
          <button type="submit" disabled={isSaving} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-orange-600 transition">
            {isSaving ? 'Wird gespeichert...' : 'TREFFEN JETZT STARTEN 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
};