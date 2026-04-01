# 🍻 PubMate – Die PWA für gesellige Abende
🌍 **Repository:** [https://github.com/tw7rr56gds-web/pubmate-pwa](https://github.com/tw7rr56gds-web/pubmate-pwa)

🌍 **Live Demo:** [https://tw7rr56gds-web.github.io/pubmate-pwa/](https://tw7rr56gds-web.github.io/pubmate-pwa/)

> Ein standortbasiertes soziales Netzwerk zur Förderung der urbanen Interaktion. 

## 1. Motivation & Idee
Die Motivation war es, in diesen trüben Zeiten im Rahmen dieser Prüfungsleistung eine Applikation zu entwickeln, die Geselligkeit schafft. Sie soll also über die Vorlesung hinaus einen sozialen Mehrwert bieten. Völlig egal, ob Bier, Schnaps oder Apfelschorle, es soll dazu führen, dass Leute, gerade in größeren Städten zusammenkommen. 

PubMate adressiert ein alltägliches soziales Phänomen im urbanen Raum: Die App ermöglicht es Nutzern, standortbasiert spontane Treffen in Bars, Pubs oder Restaurants zu organisieren oder bestehenden Runden beizutreten. Das Leitmotiv der Anwendung lautet: *"Niemand sollte alleine trinken müssen."*

---

## 2. Architektur & Technologie-Stack
Die Anwendung basiert auf einer modernen Cross-Plattform-Architektur und nutzt das Web-Ökosystem, um ein "Native-like" Benutzererlebnis (UX) zu realisieren, ohne die Restriktionen proprietärer App-Stores in Kauf nehmen zu müssen.

* **Frontend Framework:** React für eine komponentenbasierte, deklarative und reaktive UI-Architektur.
* **Build-Tool & Bundler:** Vite für extrem schnelle Entwicklungszyklen (Hot Module Replacement) und hochgradig optimierte Produktions-Bundles.
* **Styling:** Tailwind CSS als Utility-First Framework zur Gewährleistung eines konsistenten, responsiven und performanten Designs.
* **MBaaS (Backend):** Firebase als Cloud-basierter Dienst für Echtzeit-Datenhaltung (Firestore), Identitätsverwaltung (Auth) und Cloud Messaging (FCM).
* **Native Container:** Ionic Capacitor zur Einbettung der Web-Applikation in einen nativen WebView-Container, um Hardware-Schnittstellen (wie die Kamera) über eine einheitliche API anzusteuern.

---

## 3. Umsetzung der PWA-Säulen
PubMate erfüllt konsequent die architektonischen Spezifikationen einer Progressive Web App und bietet dadurch eine skalierbare User Experience.

### 3.1 Progressive & Responsive Design
Um eine konsistente Darstellung über alle Geräteklassen hinweg zu garantieren, wurde das UI-Design nach dem "Mobile-First"-Paradigma via Tailwind CSS implementiert. Zur Optimierung der Ladezeiten (Reduktion der *Time to Interactive*) und für einen schnellen *First Meaningful Paint* werden Mediendateien progressiv über Lazy-Loading-Strategien nachgeladen.

### 3.2 Installable, Linkable & Discoverable
Die Applikation kann direkt aus dem Browserverlauf ("Add to Homescreen") auf dem Endgerät installiert werden. Das dynamisch generierte `manifest.webmanifest` definiert hierbei die Systemintegration. Durch die Spezifikation `display: standalone` startet PubMate im Vollbildmodus ohne Browser-Chrome und emuliert so visuell und haptisch eine native Applikation.

### 3.3 Network Independence (Offline-Fähigkeit)
Zur Aufrechterhaltung der Funktionalität bei instabilen Netzwerkbedingungen implementiert PubMate einen Service Worker. Dieser agiert als lokaler, programmierbarer Netzwerk-Proxy. Über das Vite-PWA-Plugin (basierend auf *Workbox*) wurde eine hybride Caching-Strategie umgesetzt: Die statischen App-Shell-Ressourcen werden via Precaching beim Install-Event persistiert. Für die dynamischen Geo-Daten der Overpass API kommt eine `NetworkFirst`-Strategie zum Einsatz, um bei einem Verbindungsabbruch als "Graceful Degradation"-Fallback die letzten bekannten Bar-Standorte aus dem Cache zu liefern.

### 3.4 Re-Engageability & Push Notifications
Um das Web-typische "Pull"-Modell durch ein proaktives "Push"-Modell zu ersetzen und Nutzer reaktiv in die App zurückzuholen, wurde die Web Push API integriert. Nach explizitem User-Consent empfängt die Applikation asynchrone Hintergrundsignale via Firebase Cloud Messaging (FCM).

> **Erfahrungsbericht & Lessons Learned: Der "Two-Worker Conflict" & Single-Worker-Architektur**
> Bei der Integration von Offline-Caching (VitePWA) und Push-Nachrichten (Firebase) trat initial ein massiver Architekturkonflikt auf. Die automatische Generierung des Caching-Workers überschnitt sich mit der manuellen Registrierung des FCM-Workers (`firebase-messaging-sw.js`). Dies führte zu Race-Conditions im Browser-Scope, verworfenen Push-Tokens und der generischen Fallback-Warnung ("App wurde im Hintergrund aktualisiert") durch das Betriebssystem, da das `showNotification`-Promise nicht rechtzeitig aufgelöst wurde.
>
> *Wissenschaftliche Lösung:* Um diesen "Two-Worker Conflict" aufzulösen, wurde die Architektur auf ein **Single-Worker-Pattern** refaktorisiert. Der proprietäre Firebase-Code wurde mittels `importScripts` nativ in den Build-Prozess der Workbox integriert. Zusätzlich wurde die Token-Generierung im React-Client zwingend an den Ready-State des existierenden Workers (`navigator.serviceWorker.ready`) gebunden. Diese Verschmelzung eliminiert Ressourcenkonflikte, stabilisiert den PWA-Lifecycle und garantiert eine verlustfreie, native Zustellung der Payloads.

---

## 4. Mobile Backend as a Service (MBaaS) & Security
Der MBaaS-Ansatz abstrahiert essenzielle serverseitige Infrastruktur und delegiert diese an einen spezialisierten Cloud-Provider. PubMate nutzt das Google Firebase-Ökosystem für die JWT-basierte Authentifizierung und die Echtzeit-Synchronisation der relationalen Social-Graphen.

### 4.1 Absicherung der Applikation ("Defense in Depth")
Ein zentrales Forschungsfeld dieser Arbeit ist die spezifische Absicherung mobiler Client-Anwendungen. PubMate implementiert hierfür zwei primäre Verteidigungslinien:
1. **Client-Sicherheit (Re-Authentication Pattern):** Destruktive Account-Operationen (wie Passwortänderungen oder Datenlöschungen) erfordern ein neues Credential-Ticket. Dies schützt vor Session Hijacking bei physisch entsperrten Endgeräten.
2. **Backend-Sicherheit (Row-Level Security):** In der Firestore-Datenbank kontrollieren strikte Security Rules die Zugriffsrechte. Die Deklaration auf Dokumentenebene garantiert, dass Nutzer ausschließlich authentifiziert und nur auf ihre eigenen Datensätze schreibend zugreifen können.

> **Erfahrungsbericht & Lessons Learned: API-Keys im Client-Umfeld**
> Im Rahmen des automatisierten Deployments wurde evaluiert, dass der Firebase API-Key im Produktions-Build (`dist`) unweigerlich im Klartext einsehbar ist. Die Architekturanalyse von PWAs belegt, dass Single Page Applications (SPAs) systembedingt keine "Secrets" vor dem Client verbergen können.
> 
> *Wissenschaftliche Lösung:* Es wurde die Erkenntnis validiert, dass Sicherheit bei Serverless-Architekturen nicht durch Obfuskation ("Security by Obscurity") der Keys, sondern ausschließlich durch serverseitige Autorisierung gewährleistet wird. Als Gegenmaßnahme wurde der API-Key in der Google Cloud Console durch strikte HTTP-Referrer-Restriktionen an die spezifische GitHub-Pages-Produktionsdomain gebunden. Unabhängig davon verhindern die Firestore-Regeln jegliche unautorisierte Datenmanipulation. Die Trennung via `.env`-Dateien wurde lediglich zur Wahrung der Repository-Hygiene und Portabilität beibehalten.

---

## 5. Cross-Platform Integration (Hardware-Zugriff)
Um die Grenzen einer klassischen Web-Applikation zu durchbrechen, abstrahiert **Ionic Capacitor** die zugrundeliegende native Hardware. Capacitor behandelt Web-Assets als "First-Class Citizens" und stellt plattformagnostische TypeScript-Interfaces zur Verfügung. 

Anstatt auf limitierte HTML-File-Inputs zurückzugreifen, nutzt PubMate das `@capacitor/camera` Modul. Dies ermöglicht einen nahtlosen, nativen Zugriff auf die Systemkamera und die Dateisystem-Galerie des Betriebssystems (Android/iOS/Web), um Profilbilder zu erfassen und asynchron in den Firebase Cloud Storage zu persistieren.

---

## 6. Komplexe Anwendungslogik: Geolocation & Overpass API
Die Kernfunktionalität der synchronen Bar-Suche erfordert komplexe mathematische Berechnungen auf einer sphärischen Oberfläche. PubMate greift über die Geolocation API auf die GPS-Sensoren des Geräts zu und interpoliert diese Daten mit Points of Interest (POIs) der OpenStreetMap (Overpass API). 

Die exakte Berechnung der Luftlinie zwischen dem Nutzer und potenziellen Events erfolgt clientseitig über die **Haversine-Formel**, um die Erdkrümmung mathematisch präzise zu berücksichtigen:

$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

*(Wobei r den Erdradius definiert, φ1, φ2 die jeweiligen Breitengrade und Δλ die Differenz der Längengrade darstellen).*

## 7. Fazit
Als Quereinsteiger in die Wirtschaftsinformatik, sind solche Vorlesungen trotz der grandiosen Hilfsmittel heutzutage immer eine Herausforderung. Was mich jedoch begeistert: Die Vorlesung ist so aufgebaut, dass sie den Teilnehmerinnen und Teilnehmern von Beginn an jegliche Angst nimmt. Es war insgesamt eine sehr spannende und sehr gute Vorlesung, aus der ich definitiv sehr viel mitnehme. Die Hilfsmittel habe ich ja bereits erwähnt, am Ende bin ich dennoch ein wenig Stolz, das hier mit der Vorlesungs-Unterstützung des Professors auf die Beine gestellt zu haben! 