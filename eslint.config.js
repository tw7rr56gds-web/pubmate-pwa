import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * @file eslint.config.js
 * @description Statische Code-Analyse und Linter-Konfiguration.
 * Erzwingt die Einhaltung von "Clean Code"-Prinzipien, syntaktischer 
 * Konsistenz und architektonischen Best Practices (insbesondere für React Hooks).
 */
export default defineConfig([
  // Ausschluss von Build-Artefakten und automatisch generiertem Code
  globalIgnores(['dist', 'node_modules']),
  
  {
    // Scope: Anwendung der Regeln auf alle JavaScript- und React-Komponenten
    files: ['**/*.{js,jsx}'],
    
    // Vererbung branchenüblicher Standard-Regelsätze (Recommended Configs)
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    
    languageOptions: {
      // Spezifikation der ECMAScript-Version (ES2020 / ES6+)
      ecmaVersion: 2020,
      
      // Injektion globaler Browser-APIs (window, document, navigator) für den Linter
      globals: globals.browser,
      
      parserOptions: {
        ecmaVersion: 'latest',
        // AST-Parsing für deklarative UI-Syntax (React JSX) aktivieren
        ecmaFeatures: { jsx: true }, 
        // Deklaration als ECMAScript-Modul (ESM) für nativen import/export-Support
        sourceType: 'module',       
      },
    },
    
    /**
     * INDIVIDUELLE REGEL-ÜBERSCHREIBUNGEN (Overrides)
     * Spezifische Anpassungen zur Optimierung der Developer Experience (DX).
     */
    rules: {
      // Kapselung ungenutzter Variablen: Ignoriert ungenutzte Deklarationen, 
      // sofern diese dem PascalCase-Pattern entsprechen (z.B. UI-Komponenten in Entwicklung).
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      
      // Strikte Validierung der React-Lebenszyklen: Verhindert illegale Aufrufe 
      // von Hooks (useState, useEffect) außerhalb funktionaler Komponenten.
      ...reactHooks.configs.recommended.rules,
      
      // Vite-spezifische Optimierung: Garantiert die Funktionsfähigkeit des 
      // Hot-Module-Replacement (HMR) durch strikte Export-Limitierungen.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]);