import { useState, useEffect } from 'react';

// --- CUSTOM HOOK ---
// Kapselt die Logik für den Zugriff auf native Geräte-APIs (Geolocation)
// in einem modular wiederverwendbaren React Hook.
export const useLocation = () => {
  // --- REACTIVE STATE MANAGEMENT ---
  // Verwaltung der UI- und Daten-Zustände während der asynchronen GPS-Abfrage
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- EFFECT HOOK & NATIVE API ACCESS ---
  // Führt den Seiteneffekt (Abfrage der Hardware-Sensoren) nur beim ersten Mounten aus
  useEffect(() => {
    // --- PROGRESSIVE ENHANCEMENT: FEATURE DETECTION ---
    // Dynamische Laufzeitprüfung, ob das Endgerät/der Browser die Geolocation API unterstützt.
    // Verhindert Abstürze in restriktiven oder veralteten Umgebungen.
    if (!("geolocation" in navigator)) {
      setError("Dein Gerät unterstützt keine Standortermittlung.");
      setIsLoading(false);
      return;
    }

    // --- ASYNC BROWSER API ---
    // Asynchrone Abfrage des echten GPS-Standorts über den Browser
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Erfolgsfall: Lokalen State mit den auf 4 Nachkommastellen formatierten Koordinaten aktualisieren
        setLocation({
          latitude: position.coords.latitude.toFixed(4),
          longitude: position.coords.longitude.toFixed(4),
        });
        setIsLoading(false);
      },
      (err) => {
        // Graceful Degradation: Saubere Fehlerbehandlung, falls der User die Hardware-Berechtigung verweigert
        setError("Bitte erlaube den Standortzugriff, um Leute in der Nähe zu finden.");
        setIsLoading(false);
      }
    );
  }, []); // Leeres Dependency-Array: Der Hook feuert nur beim Initial-Render

  return { location, error, isLoading };
};