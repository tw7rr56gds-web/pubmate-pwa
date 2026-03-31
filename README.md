# 🍻 PubMate – Die PWA für gesellige Abende

> **Seminararbeit im Modul "Development of Mobile Business Applications"**
> Ein standortbasiertes soziales Netzwerk zur Förderung der urbanen Interaktion. 

## 1. Motivation & Idee
Die Entwicklung mobiler Applikationen erfordert die Berücksichtigung spezifischer Anforderungen wie den Nutzerkontext, begrenzte Ressourcen und wechselnde Netzwerkanbindungen. Traditionelle native Apps gehen oft mit hohen Entwicklungsaufwänden einher. Um diese Hürden zu überwinden und eine einheitliche Code-Basis zu nutzen, wurde **PubMate** als Progressive Web App (PWA) konzipiert. 

PubMate löst ein alltägliches soziales Problem im urbanen Raum: Die App ermöglicht es Nutzern, spontane Treffen in Bars, Pubs oder Restaurants in ihrer unmittelbaren Umgebung zu organisieren oder bestehenden Runden beizutreten. Ganz nach dem Motto: *"Niemand sollte alleine trinken müssen."*

---

## 2. Architektur & Technologie-Stack
Die Anwendung basiert auf einer modernen Cross-Plattform-Architektur und nutzt das Web-Ökosystem, um ein "Native-like" Benutzererlebnis zu schaffen.

* **Frontend Framework:** React für eine komponentenbasierte, deklarative UI.
* **Build-Tool & Bundler:** Vite für extrem schnelle Entwicklungszyklen (Hot Module Replacement) und effiziente Produktions-Bundles.
* **Styling:** Tailwind CSS als Utility-First Framework für ein konsistentes und responsives Design.
* **MBaaS (Backend):** Firebase als Cloud-basierter Dienst für Echtzeit-Datenhaltung, Nutzerverwaltung und Push-Nachrichten.
* **Native Container:** Ionic Capacitor zur Einbettung der Web-Applikation in einen nativen Container, um Hardware-Schnittstellen (Kamera) anzusteuern.

---

## 3. Umsetzung der PWA-Säulen
PubMate erfüllt konsequent die architektonischen Anforderungen an eine Progressive Web App und bietet dadurch mehrere Erfahrungsebenen für den Nutzer.

### 3.1 Progressive & Responsive Design
Webseiten, die mit einem responsiven Designansatz entwickelt wurden, passen ihr Layout unter anderem durch CSS3 Media Queries an. PubMate nutzt den Mobile-First-Ansatz von Tailwind CSS. Zur Optimierung der Ladezeiten und für einen schnellen "First Meaningful Paint" werden Bilder zudem progressiv via Lazy-Loading nachgeladen.

### 3.2 Installable, Linkable & Discoverable
Die Applikation kann direkt aus dem Browser auf dem Endgerät installiert werden. Dies wird durch das `manifest.webmanifest` ermöglicht. Durch den Parameter `display: standalone` startet PubMate in einem eigenen Fenster ohne störenden Browser-Chrome und verhält sich visuell wie eine native App.

### 3.3 Network Independence (Offline-Fähigkeit)
Da Webseiten standardmäßig nicht offline verfügbar sind, implementiert PubMate einen Service Worker. Dieser fungiert als programmierbarer Netzwerk-Proxy, der Requests abfängt und modifiziert. Über das Vite-PWA-Plugin (Workbox) wurde eine hybride Caching-Strategie umgesetzt. Für die externe Overpass API kommt die Strategie `NetworkFirst` zum Einsatz, um bei einem Netzwerkausfall den letzten bekannten Bar-Standort aus dem Cache zu liefern.

### 3.4 Re-Engageability
Um das Paradigma vom "Pull"- zum "Push"-Modell zu wechseln und Nutzer zurück in die App zu holen, wurden Push-Benachrichtigungen integriert. Über die Web Notification API fordert die App nach expliziter Nutzerinteraktion die Berechtigung an. Im Hintergrund registriert ein Service Worker die Push-Events über Firebase Cloud Messaging (FCM).

> **Erfahrungsbericht & Lessons Learned: Service Worker Scope auf GitHub Pages**
> Bei der Implementierung von Firebase Cloud Messaging (FCM) für die Bereitstellung auf *GitHub Pages* trat initial ein Routing-Fehler (HTTP 404) auf. Die Ursache lag in der Standardkonfiguration von Firebase, welches den Service Worker (`firebase-messaging-sw.js`) zwingend im Root-Verzeichnis (`/`) der Domain erwartet. Da GitHub Pages Projekte standardmäßig in Unterverzeichnissen (z. B. `/pubmate-pwa/`) hostet, schlug die automatische Registrierung fehl. 
> *Lösung:* Das Problem wurde gelöst, indem die automatische Registrierung durch Firebase deaktiviert und stattdessen eine manuelle Registrierung des Service Workers im React-Code (`Sidebar.jsx`) implementiert wurde. Durch die Injektion der Vite-Umgebungsvariable `import.meta.env.BASE_URL` konnte der Pfad zum Service Worker dynamisch an das jeweilige Deployment-Verzeichnis angepasst werden, was eine fehlerfreie Registrierung und Token-Generierung sicherstellte.

---

## 4. Mobile Backend as a Service (MBaaS) & Security
Der MBaaS-Ansatz lagert essenzielle Backend-Infrastruktur an einen Cloud-Provider aus. PubMate nutzt Google Firebase für die JWT-basierte Authentifizierung, Echtzeit-Synchronisation (Firestore) und Speicherung von Mediendateien.

### 4.1 Absicherung der Applikation
Ein zentrales Lernziel ist das spezielle Bedürfnis nach einer Absicherung mobiler Applikationen. PubMate implementiert hierfür zwei zentrale Verteidigungslinien:
1. **Client-Sicherheit (Re-Authentication Pattern):** Sensitive Account-Operationen erzwingen eine erneute Eingabe der Zugangsdaten, um Session Hijacking bei entsperrten Endgeräten zu verhindern. 
2. **Backend-Sicherheit (RLS):** In der Firestore-Datenbank kontrollieren Sicherheitsregeln auf Dokumentenebene (vergleichbar mit Row-Level Security), dass Nutzer nur authentifiziert Daten modifizieren dürfen.

> **Erfahrungsbericht & Lessons Learned: API-Keys im Client-Umfeld**
> Im Rahmen des automatisierten Deployments via Vite wurde ersichtlich, dass der Firebase API-Key im minifizierten Produktions-Build (im `dist`-Ordner) im Klartext einsehbar war. Zunächst wurde dies als kritischer Leak bewertet. Die Analyse der PWA-Architektur ergab jedoch, dass Client-seitige Web-Applikationen systembedingt keine echten "Secrets" vor dem Endnutzer verbergen können, da der Browser den Key zur Kommunikation mit dem MBaaS-Backend benötigt.
> *Lösung:* Es wurde die Erkenntnis gewonnen, dass Sicherheit bei PWAs nicht durch das Verstecken von Keys ("Security by Obscurity"), sondern durch serverseitige Autorisierung erreicht wird. Zur finalen Absicherung wurde der API-Key in der Google Cloud Console durch strikte Domain-Einschränkungen (`Referrer`) exklusiv auf die GitHub-Pages-URL limitiert. Zusätzlich verhindern die oben genannten Firestore Security Rules, dass unautorisierte Anfragen (selbst mit gültigem Key) Daten manipulieren können. Die Trennung von Quellcode und Keys via `.env`-Dateien wurde dennoch beibehalten, um das Repository sauber zu halten und das Lifecycle-Management zu vereinfachen.

---

## 5. Cross-Platform Integration & Native Features
Um das volle Potenzial der Endgeräte zu nutzen, wird PubMate über **Ionic Capacitor** ausgeführt. Capacitor behandelt native Projekte als "First-Class Citizens" und bettet die Web-Applikation in eine performante WebView ein. 

Über das Capacitor Camera Plugin (`@capacitor/camera`) schlägt die App eine Brücke zur nativen Hardware. Anstatt auf klassische HTML-File-Inputs zurückzugreifen, können Nutzer plattformübergreifend und nahtlos direkt auf die Systemkamera oder die native Fotogalerie zugreifen, um ihr Profilbild zu aktualisieren.

---

## 6. Komplexe Anwendungslogik: Geolocation & Overpass API
Die Kernfunktionalität der Bar-Suche basiert auf der Ermittlung von Distanzen auf einer sphärischen Oberfläche. PubMate nutzt die GPS-Sensoren des Geräts via Geolocation API und fragt Points of Interest (POIs) über die Nominatim/Overpass API ab. 

Die Berechnung der Distanz zwischen dem Nutzer und potenziellen Treffen erfolgt im Code über die **Haversine-Formel**, um die Erdkrümmung mathematisch korrekt zu berücksichtigen:

$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

*(Wobei r der Erdradius ist, φ1, φ2 die Breitengrade und Δλ die Differenz der Längengrade darstellen).*

---

## 7. Lokale Installation & Deployment

Das Projekt kann vollständig lokal ausgeführt oder für die Produktion gebündelt werden.

### Voraussetzungen
* Node.js (v18+)
* Firebase Projekt mit aktivierter Authentifizierung (E-Mail) und Firestore.

### Setup-Schritte
1. **Repository klonen:**
   ```bash
   git clone [https://github.com/DEIN-USERNAME/pubmate-pwa.git](https://github.com/DEIN-USERNAME/pubmate-pwa.git)
   cd pubmate-pwa