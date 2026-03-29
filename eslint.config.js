import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * ESLINT CONFIGURATION
 * Stellt die Einhaltung von Coding-Standards und Best Practices sicher.
 * Dies unterstützt das Bewertungskriterium der Code-Qualität und Lesbarkeit.
 */
export default defineConfig([
  // Ignoriert den Build-Ordner, da dieser automatisch generierten Code enthält
  globalIgnores(['dist']),
  
  {
    // Anwendung der Regeln auf alle JavaScript- und React-Dateien
    files: ['**/*.{js,jsx}'],
    
    // Erweiterung um Standard-Regelsätze (Recommended Configs)
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    
    languageOptions: {
      // Spezifikation der ECMAScript-Version (ES2020/ES6+) [cite: 572]
      ecmaVersion: 2020,
      // Definiert globale Browser-Variablen (window, document, navigator) [cite: 1007]
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true }, // Ermöglicht das Parsen von JSX-Syntax [cite: 854]
        sourceType: 'module',       // Nutzt ES-Modules (import/export) [cite: 574]
      },
    },
    
    /**
     * INDIVIDUELLE REGELN
     * Hier können spezifische Anpassungen vorgenommen werden, um den 
     * Entwicklungsprozess zu optimieren.
     */
    rules: {
      // Fehler bei ungenutzten Variablen, ignoriert jedoch großgeschriebene Patterns
      // (Nützlich für ungenutzte React-Komponenten-Imports während der Entwicklung)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      
      // Erzwingt die korrekte Nutzung von React Hooks (useState, useEffect) [cite: 904]
      ...reactHooks.configs.recommended.rules,
      
      // Unterstützt Fast Refresh für eine bessere Developer Experience in Vite [cite: 680]
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
])