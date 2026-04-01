import { useState, useEffect } from 'react';

/**
 * @hook useLocation
 * @description Kapselt die asynchrone Logik für den Zugriff auf native Hardware-Sensoren (GPS).
 * Implementiert das "Separation of Concerns" Pattern, indem die komplexe Sensor-Logik 
 * vollständig von den deklarativen UI-Komponenten entkoppelt wird.
 */
export const useLocation = () => {
  
  // --- LOKALES STATE MANAGEMENT ---
  // Verwaltung der reaktiven Zustände während des asynchronen Sensor-Lebenszyklus
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- SIDE EFFECTS & HARDWARE ACCESS ---
  useEffect(() => {
    let isMounted = true; // Memory Leak Protection: Verhindert State-Updates nach Unmount

    // PROGRESSIVE ENHANCEMENT: Feature Detection
    // Prüft zur Laufzeit, ob der Browser/das Endgerät die Geolocation API unterstützt.
    if (!("geolocation" in navigator)) {
      if (isMounted) {
        setError("Hardware-Limitierung: Dein Endgerät unterstützt keine Standortermittlung.");
        setIsLoading(false);
      }
      return;
    }

    // --- HARDWARE OPTIMIZATION ---
    // Konfiguration für mobile Endgeräte (Balancierung von Genauigkeit vs. Ressourcen/Akku)
    const geoOptions = {
      enableHighAccuracy: true, // Erzwingt präzises GPS anstelle von ungenauer IP/WLAN-Triangulation
      timeout: 15000,           // Abbruch nach 15 Sekunden (verhindert Endlos-Ladezustände)
      maximumAge: 60000         // Akzeptiert bis zu 1 Minute alte Cache-Daten zur Ressourcenschonung
    };

    // ASYNC SENSOR API: Abfrage der aktuellen geografischen Koordinaten
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isMounted) {
          // Erfolgsfall: Persistierung der exakten Floats (Numbers) für die spätere 
          // clientseitige Distanzberechnung via Haversine-Algorithmus.
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLoading(false);
        }
      },
      (err) => {
        if (isMounted) {
          // GRACEFUL DEGRADATION: Sicheres Abfangen von Berechtigungsverweigerungen (User Consent)
          // oder Hardware-Timeouts, ohne dass die Applikation abstürzt.
          console.warn("[Sensor Error] Geolocation API:", err.message);
          setError("Bitte erlaube den Standortzugriff im Browser, um Treffen in deiner Nähe zu finden.");
          setIsLoading(false);
        }
      },
      geoOptions // Übergabe der Performance-Konfiguration
    );

    // Lifecycle-Cleanup-Funktion des Effects
    return () => {
      isMounted = false;
    };
  }, []); // Leeres Dependency-Array: Garantiert die Ausführung exakt einmal beim Mounten

  return { location, error, isLoading };
};