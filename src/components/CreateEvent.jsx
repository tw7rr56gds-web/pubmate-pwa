import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @component CreateEvent
 * @description Modale UI-Komponente zur Generierung neuer, standortbasierter Treffen.
 * Implementiert eine asynchrone Anbindung an die Overpass API (OpenStreetMap) zur 
 * dynamischen POI-Auflösung sowie eine direkte Schreib-Integration in das Firebase MBaaS.
 */
export const CreateEvent = ({ user, userData, location, onClose }) => {
  
  // --- REACTIVE STATE MANAGEMENT (Controlled Components) ---
  // Verwaltung asynchroner UI-Zustände (Ladeindikatoren, Button-Sperren)
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Deklarative Datenbindung (Data Binding) für Formular-Entitäten
  const [selectedVenue, setSelectedVenue] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState(''); 
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPeople, setMaxPeople] = useState('2');
  const [motto, setMotto] = useState('');
  const [description, setDescription] = useState(''); 
  const [venueCoords, setVenueCoords] = useState(null);

  // --- DATA TRANSFORMATION & SANITIZATION ---
  /**
   * Extrahiert und normalisiert unstrukturierte Adressdaten aus der OSM-API.
   * @param {Object} tags - Die Metadaten eines OSM-Knotens (Node/Way).
   * @returns {String} Formatierte Adresse oder leeres String-Fallback.
   */
  const formatAddress = (tags) => {
    const street = tags["addr:street"] || "";
    const houseNumber = tags["addr:housenumber"] || "";
    const postCode = tags["addr:postcode"] || "";
    const city = tags["addr:city"] || "";
    
    // Fallback-Logik für POIs mit unvollständigen Geodaten
    if (!street && !city) return "";
    return `${street} ${houseNumber}, ${postCode} ${city}`.trim();
  };

  // --- SIDE EFFECTS & EXTERNAL API INTEGRATION ---
  /**
   * Asynchroner Fetch-Lifecycle: Ruft lokale Points of Interest (POIs) ab, 
   * sobald valide Geolocation-Daten des Nutzers vorliegen.
   */
  useEffect(() => {
    // Guard Clause: Abbruch, falls Geodaten noch nicht vom Sensor geliefert wurden
    if (!location || !location.latitude || !location.longitude) return;

    let isMounted = true; // Verhindert State-Updates auf unmounted Components (Memory Leak Protection)

    const fetchVenues = async () => {
      setLoadingVenues(true);
      try {
        // Overpass QL Query: Suchradius 3000 Meter um die aktuellen Nutzerkoordinaten
        const query = `[out:json][timeout:10];(node["amenity"~"pub|bar|restaurant"](around:3000,${location.latitude},${location.longitude});way["amenity"~"pub|bar|restaurant"](around:3000,${location.latitude},${location.longitude}););out center;`;
        
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Netzwerkantwort der Overpass API war nicht ok.");
        
        const data = await response.json();

        // Data Normalization & Deduplication: Mappt API-Response auf lokales State-Modell
        const validVenues = data.elements
          .filter(v => v.tags && v.tags.name)
          .map(v => ({ 
            id: v.id, 
            name: v.tags.name, 
            address: formatAddress(v.tags),
            lat: v.lat || (v.center ? v.center.lat : null),
            lon: v.lon || (v.center ? v.center.lon : null)
          }))
          // Herausfiltern redundanter Datenpunkte (OSM Node vs. Way Konflikte)
          .filter((value, index, self) => index === self.findIndex((t) => t.name === value.name))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (isMounted) {
          setVenues(validVenues);
          // Fallback auf manuelle Eingabe, falls das Array leer ist
          if (validVenues.length === 0) setSelectedVenue('manual');
        }
      } catch (error) {
        // GRACEFUL DEGRADATION (PWA Architektur-Pattern): 
        // Bei Netzwerk- oder API-Fehlern bricht die App nicht ab, sondern fällt 
        // auf die manuelle Freitexteingabe zurück, um die Kernfunktion zu erhalten.
        console.warn("[API Fallback] Fehler beim Laden der Locations:", error);
        if (isMounted) {
          setVenues([]);
          setSelectedVenue('manual');
        }
      } finally {
        if (isMounted) setLoadingVenues(false);
      }
    };

    fetchVenues();

    // Cleanup-Funktion des Effects
    return () => { isMounted = false; };
  }, [location]); // Re-Triggering ausschließlich bei Änderung der geographischen Position

  // --- EVENT HANDLERS ---
  /**
   * Synchronisiert die Formular-Inputs dynamisch mit dem ausgewählten POI.
   */
  const handleVenueChange = (e) => {
    const val = e.target.value;
    setSelectedVenue(val);
    
    if (val === 'manual') {
      // Reset des States für manuelle Override-Eingaben
      setVenueName('');
      setVenueAddress('');
      setVenueCoords(null);
    } else {
      // Auto-Fill der UI-Felder durch referenzierte API-Daten
      const selected = venues.find(v => v.id.toString() === val);
      if (selected) {
        setVenueName(selected.name);
        setVenueAddress(selected.address || ""); 
        setVenueCoords({ lat: selected.lat, lon: selected.lon });
      }
    }
  };

  // --- MBaaS INTEGRATION: FIRESTORE (WRITE OPERATION) ---
  /**
   * Validiert den Client-State und persistiert das Event-Dokument in der NoSQL-Datenbank.
   */
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    // Client-seitige Datenvalidierung vor dem Backend-Call
    if (!venueName || !date || !time || !motto) {
      alert("Validierungsfehler: Bitte fülle alle zwingenden Felder (Name, Datum, Uhrzeit, Motto) aus.");
      return;
    }

    setIsSaving(true);
    try {
      // Generierung eines neuen relationalen Dokuments in der "events" Collection
      await addDoc(collection(db, "events"), {
        creatorId: user.uid,
        creatorName: userData.benutzername,
        creatorPic: userData.profilbild_url || null,
        venueName: venueName,
        venueAddress: venueAddress, 
        // Geolocation-Priorisierung: Nutzt exakte Bar-Koordinaten oder (Fallback) den User-Standort
        latitude: venueCoords?.lat || location.latitude,
        longitude: venueCoords?.lon || location.longitude,
        datum: date,
        uhrzeit: time,
        maxPersonen: parseInt(maxPeople, 10), // Typensicherheit für Datenbank-Queries
        teilnehmer: [user.uid], // Der Ersteller wird initial dem Teilnehmer-Array (Social Graph) hinzugefügt
        motto: motto,
        beschreibung: description, 
        createdAt: serverTimestamp(), // Nutzung des Backend-Timestamps zur Umgehung von Client-Uhr-Differenzen
        status: "open"
      });
      
      onClose(); // Terminierung der modalen Ansicht nach erfolgreichem Write
    } catch (error) {
      console.error("Firestore Write Error:", error);
      alert("Fehler bei der Cloud-Synchronisation: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DECLARATIVE UI RENDERING ---
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">Neues Treffen 🍻</h2>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          
          {/* Sektion: POI / Location Routing */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location wählen</label>
            <select 
              value={selectedVenue} 
              onChange={handleVenueChange}
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
            >
              <option value="">{loadingVenues ? 'API-Abfrage läuft...' : 'Wähle einen Ort in deiner Nähe'}</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              <option value="manual" className="font-bold text-orange-600">✏️ Eigene Location manuell eingeben...</option>
            </select>
          </div>

          {/* Sektion: Detaillierte Geo-Metadaten */}
          <div className="space-y-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div>
              <label className="block text-xs font-bold text-orange-600 uppercase mb-1 text-[10px]">Name der Location</label>
              <input 
                type="text" 
                value={venueName} 
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="z.B. Sky Beach"
                className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm transition-shadow focus:ring-2 focus:ring-orange-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-600 uppercase mb-1 text-[10px]">Genaue Adresse</label>
              <input 
                type="text" 
                value={venueAddress} 
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Straße, Hausnummer, PLZ & Ort"
                className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm transition-shadow focus:ring-2 focus:ring-orange-300 outline-none"
              />
            </div>
          </div>

          {/* Sektion: Temporale Planung (Flexbox-Grid) */}
          <div className="flex gap-4 text-sm">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Datum</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-300" 
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Uhrzeit</label>
              <input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-300" 
              />
            </div>
          </div>

          {/* Sektion: Kapazitätssteuerung via Range-Slider */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">
              Max. Personen: <span className="text-orange-600 text-lg ml-1">{maxPeople}</span>
            </label>
            <input 
              type="range" 
              min="2" 
              max="15" 
              value={maxPeople} 
              onChange={(e) => setMaxPeople(e.target.value)} 
              className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500" 
            />
          </div>

          {/* Sektion: Kontext & Metadaten */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Was hast du vor?</label>
            <input 
              type="text" 
              placeholder="z.B. Cornern, Fußball schauen..." 
              value={motto} 
              onChange={(e) => setMotto(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-300" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Details zum Treffen</label>
            <textarea 
              placeholder="Was ist genau geplant? Woran erkennt man dich?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-300 min-h-[80px] resize-none" 
            />
          </div>

          {/* Sektion: Action-Area (inkl. UX-Feedback) */}
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="w-1/3 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              disabled={isSaving} 
              className={`w-2/3 text-white font-black py-4 rounded-2xl shadow-lg transition-all ${isSaving ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 active:scale-95'}`}
            >
              {isSaving ? 'Wird gespeichert...' : 'STARTEN 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};