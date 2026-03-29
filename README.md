# PubMate 🍻 – Die PWA für gesellige Abende

## 1. Motivation & Idee
PubMate ist eine Progressive Web App (PWA), die darauf abzielt, die soziale Interaktion im urbanen Raum zu fördern. Die App ermöglicht es Nutzern, spontane Treffen in Bars, Pubs oder Restaurants in ihrer unmittelbaren Umgebung zu organisieren oder bestehenden Runden beizutreten. Das Motto lautet: "Niemand sollte alleine trinken müssen."

## 2. Architektur & Technik
[cite_start]Die App basiert auf einer modernen Cross-Plattform-Architektur [cite: 1095] [cite_start]und nutzt einen Mobile Backend as a Service (MBaaS) Ansatz[cite: 78, 1166].

### Tech-Stack:
* [cite_start]**Frontend:** React (Vite) für eine reaktive und performante UI[cite: 675, 791].
* [cite_start]**Styling:** Tailwind CSS für ein responsives Design (Mobile-First)[cite: 993, 1014].
* [cite_start]**Backend (MBaaS):** Firebase[cite: 82, 1166]:
    * [cite_start]**Authentication:** Sicherer Login und Registrierung (E-Mail/Passwort)[cite: 1166].
    * [cite_start]**Firestore:** NoSQL-Echtzeitdatenbank für Events und Nutzerprofile[cite: 1166].
    * [cite_start]**Storage:** Speicherung von Profilbildern[cite: 1184].
    * [cite_start]**Cloud Messaging:** Push-Benachrichtigungen zur Re-Engageability[cite: 1084].
* [cite_start]**Native Features:** Capacitor zur Integration der Hardware-Kamera[cite: 1098, 1114].

## 3. PWA-Features (Anforderungen nach Pfisterer)
[cite_start]PubMate erfüllt die vier zentralen Säulen einer Progressive Web App[cite: 85, 1001]:

* [cite_start]**Responsive:** Die Benutzeroberfläche passt sich flüssig an verschiedene Bildschirmgrößen an und nutzt moderne CSS-Layout-Modelle (Flexbox)[cite: 1014, 1140].
* [cite_start]**Installable:** Über ein Web App Manifest kann PubMate direkt auf dem Homescreen installiert werden und startet im Standalone-Modus[cite: 1042, 1045].
* [cite_start]**Network Independence:** Ein Service Worker fungiert als programmierbarer Proxy, fängt Netzwerkanfragen ab und ermöglicht durch Caching die Offline-Verfügbarkeit der App-Hülle[cite: 1056, 1066].
* [cite_start]**Re-Engageability:** Integration der Notification API und Firebase Cloud Messaging, um Nutzer über neue Treffen in ihrer Nähe zu informieren[cite: 1076, 1084].

## 4. Besondere Funktionen
* [cite_start]**Standortbasierte Suche:** Nutzung der Geolocation API zur Berechnung von Distanzen (Haversine-Formel) im gewählten Radius[cite: 1007].
* [cite_start]**API-Integration:** Dynamisches Laden von Locations über die Overpass API (OpenStreetMap)[cite: 212].
* [cite_start]**Progressive Loading:** Optimierte Ladezeiten durch Lazy Loading von Bildern[cite: 1009].

## 5. Installation & Start
1. Repository klonen.
2. `npm install` ausführen.
3. `.env` Datei mit eigenen Firebase-Credentials erstellen.
4. `npm run dev` für den Entwicklungsmodus oder `npm run build && npm run preview` für den PWA-Test.