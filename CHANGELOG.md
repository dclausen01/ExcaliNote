# 🔄 ExcaliNote - Changelog

## Version 0.1.4 - 12/4/2025

### 🚀 Major Code Quality & Performance Improvements

#### ✅ **Logging System - Vollständig überarbeitet:**

- **Strukturiertes Logging:** Komplette Migration von `console.log/console.error` zu professionellem Logger
  - TypeScript Type Safety für alle Logging-Aufrufe
  - Entwicklungs-/Production-Modus Unterstützung
  - Strukturierte Log-Nachrichten mit Kontextdaten
  - Bessere Debugging-Möglichkeiten und Error-Tracking

#### ⚡ **Performance & UX Verbesserungen:**

- **Loading States:** Neue Loading-Indikatoren für bessere User Experience

  - `isLoading` State im NotebookStore
  - Visual Loading-Spinner in der Editor-Toolbar
  - "Lade Ordnerstruktur..." Feedback während Datenoperationen
  - Bessere App-Responsiveness Wahrnehmung

- **Memory Leak Prevention:** Automatisches Debouncing optimiert
  - useRef-basierte Timeout-Verwaltung
  - Automatische Cleanup-Mechanismen
  - Performance-Optimierung bei vielen schnellen Änderungen

#### 🔧 **Code Quality & Type Safety:**

- **TypeScript Enhancements:** Vollständige Type Safety implementiert

  - Entfernung aller `any` Types in Editor.tsx
  - ExcalidrawImperativeAPI Import für bessere Typisierung
  - Verbesserte Type Definition für NotebookStore Interface

- **Error Boundary Protection:** Robuste Error-Handling Implementierung
  - React Error Boundary für graceful Error Recovery
  - Benutzerfreundliche Error-Nachrichten
  - Automatische App-Recovery bei Komponenten-Fehlern

#### 🛡️ **Security & Stability (bereits implementiert):**

- **Path Traversal Protection:** Sichere Pfad-Validierung
- **Sichere Pfad-Manipulation:** Cross-platform Pfad-Handling
- **Performance Optimierung:** useMemo für getAllFolders
- **Dead Code Elimination:** buildTree Funktion entfernt

### 📁 **Geänderte Dateien:**

- `src/utils/logger.ts` - Neuer Logger Service
- `src/store/notebookStore.ts` - Logging Integration + Loading States
- `src/components/Editor/Editor.tsx` - Logger Integration + Loading UI
- `src/types/index.ts` - NotebookStore Interface erweitert
- `src/components/ErrorBoundary.tsx` - Error Handling (bereits vorhanden)
- `package.json` - Version 0.1.4

### 🎯 **Impact:**

- **Production Ready:** Verbesserte Robustheit und Stabilität
- **Better Debugging:** Strukturierte Logs für einfacheres Troubleshooting
- **Enhanced UX:** Loading States für bessere User Experience
- **Code Quality:** TypeScript Type Safety und Performance Optimierungen
- **Security:** Path Traversal Protection und sichere Dateisystem-Operationen

---

## Version 0.1.1 - 12/3/2025

### 🛠️ Bugfixes & Verbesserungen

#### ✅ **UI/UX Verbesserungen:**

- **Grid Togglebar:** Users können jetzt selbst steuern, ob ein Grid im Excalidraw angezeigt wird

  - Neue Toolbar mit Grid-Toggle-Button
  - Visueller Status: "Grid an"/"Grid aus"
  - Bessere Benutzerkontrolle über Canvas-Darstellung

- **Electron-Menü entfernt:** Komplettes Browser-Fenstermenü entfernt
  - Saubere, fokussiertere App-Oberfläche
  - Entfernung von nicht-funktionalen Menüpunkten
  - Code um ~80 Zeilen bereinigt

#### 🔧 **Technische Fixes:**

- **Banner-Asset-Pfad:** Korrigiert für Vite Development/Production

  - Vorher: `../../assets/excalinotes_banner.png`
  - Nachher: `/assets/excalinotes_banner.png`
  - Banner wird jetzt korrekt im Welcome-Screen angezeigt

- **App-Icon-Pfad:** Korrigiert für Production-Builds
  - Icon wird sowohl in Development als auch in installierter App korrekt angezeigt
  - Taskbar und Titelleiste zeigen ExcaliNote-Icon

#### 🎯 **Grid-System:**

- **User-kontrolliertes Grid:** Von hartem `gridModeEnabled={true}` zu:
  - `gridModeEnabled={gridEnabled}` (user state)
  - `useState(false)` (standardmäßig aus)
  - Toggle-Button für sofortige Kontrolle

### 📁 **Geänderte Dateien:**

- `src/components/Editor/Editor.tsx` - Grid Toggle + Banner Pfad
- `electron/main.ts` - Menü entfernt + Import bereinigt

### 🎉 **Ergebnis:**

- **Saubere UI:** Kein überflüssiges Menü mehr
- **User-Kontrolle:** Grid nach Wunsch ein-/ausblendbar
- **Korrekte Assets:** Banner und Icon funktionieren in allen Modi
- **Bessere UX:** Fokus auf funktionale Features statt Browsermenü

**Status:** ✅ Alle 5 gemeldeten Probleme vollständig gelöst!
