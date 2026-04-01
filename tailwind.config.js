/**
 * @file tailwind.config.js
 * @description Zentrale Konfiguration des Utility-First CSS-Frameworks.
 * Implementiert das "Mobile-First" Paradigma für Responsive Web Design (RWD)
 * und steuert das zugrundeliegende Design-System der Progressive Web App.
 */

/** @type {import('tailwindcss').Config} */
export default {
  // --- TREE-SHAKING & BUNDLE OPTIMIZATION ---
  // Definiert alle Pfade, in denen Tailwind nach verwendeten Klassen suchen soll.
  // Unbenutzte CSS-Klassen werden im Produktions-Build automatisch via PurgeCSS 
  // entfernt, um die Payload-Größe (CSS-Bloat) drastisch zu reduzieren.
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  // --- DESIGN SYSTEM & CORPORATE IDENTITY ---
  theme: {
    extend: {
      // Kapselung von proprietären Markenfarben als "Design Tokens".
      // Fördert die UI-Konsistenz und Wartbarkeit über die gesamte Applikation hinweg.
      colors: {
        pubOrange: '#ff9800',
      },
      // Zukunftsfähigkeit: Hier können bei Bedarf proprietäre Breakpoints oder 
      // Safe-Area-Paddings (z.B. für iOS Notches) global definiert werden.
    },
  },

  // --- ERWEITERBARKEIT (PLUGINS) ---
  // Schnittstelle für externe Tailwind-Plugins (z.B. Typografie, Formulare), 
  // die bei steigender Komplexität der Applikation nahtlos injiziert werden können.
  plugins: [],
}