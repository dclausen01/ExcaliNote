# 🔄 ExcaliNote - Changelog

## Version 0.3.1 - 12/5/2025

### 🐛 Critical Bugfix - Speicherung funktioniert jetzt zuverlässig

#### ✅ **Alle Änderungen werden jetzt gespeichert:**

- **Problem behoben:** Zu restriktive Change-Detection erkannte viele Änderungen nicht
  - Textänderungen wurden nicht gespeichert
  - Farb- und Style-Änderungen gingen verloren
  - Rotationen und andere Transformationen wurden ignoriert
- **Lösung:** Vereinfachte Change-Detection
  - Excalidraw ruft `onChange` nur bei tatsächlichen Änderungen auf
  - Keine manuelle Prüfung mehr nötig
  - Alle Änderungen werden zuverlässig erkannt
- **Zusätzlich entfernt:** `validateEmbeddable` Prop (verhinderte Website-Embeds)

#### 📁 **Geänderte Dateien:**

- `src/components/Editor/Editor.tsx` - Vereinfachte handleChange Logik
- `package.json` - Version 0.3.1

#### 🎯 **Impact:**

- **Zuverlässig:** Alle Änderungen werden jetzt gespeichert
- **Einfacher:** Weniger komplexe Logik
- **Schneller:** Keine unnötigen Vergleiche mehr

---

## Version 0.3.0 - 12/5/2025

### 🎯 BREAKING CHANGE - Inline Image Storage (Excalidraw-Standard)

#### ✅ **Bilder werden jetzt inline gespeichert (wie von Excalidraw vorgesehen):**

- **Vereinfachte Architektur:** Bilder werden als Base64-DataURLs direkt in der .excalidraw-Datei gespeichert
  - Kein separater `.excalidraw.files` Ordner mehr nötig
  - Bilder sind Teil der JSON-Datei (im `files`-Objekt)
  - Folgt dem offiziellen Excalidraw-Dateiformat
  - Einfachere Dateistruktur und Backup

#### 🔧 **Technische Änderungen:**

- **Entfernung komplexer Bild-Logik:**

  - `saveImages()`, `loadImages()`, `cleanupUnusedImages()` nicht mehr verwendet
  - Keine separate Dateisystem-Operation für Bilder
  - Einfacheres Laden und Speichern
  - Weniger Fehlerquellen

- **Excalidraw-konform:**
  - Bilder werden inline als Teil von `files: BinaryFiles` gespeichert
  - DataURLs (Base64) direkt in JSON
  - Vollständig kompatibel mit offiziellem Excalidraw-Format
  - Notizen können direkt in Excalidraw.com importiert werden

#### 📁 **Geänderte Dateien:**

- `src/components/Editor/Editor.tsx` - Vereinfachte Lade- und Speicherlogik
- `src/store/notebookStore.ts` - Entfernung des `.excalidraw.files` Filters
- `package.json` - Version 0.3.0

#### 🎯 **Vorteile:**

- **Einfacher:** Keine separate Bild-Verwaltung mehr
- **Standard-konform:** Verwendet offizielles Excalidraw-Format
- **Zuverlässiger:** Weniger bewegliche Teile = weniger Fehler
- **Portabel:** Notizen können einfach kopiert/geteilt werden (alles in einer Datei)
- **Backup-freundlich:** Eine Datei = eine komplette Notiz mit allen Bildern

#### ⚠️ **Migration:**

- Alte Notizen mit separaten `.excalidraw.files` Ordnern funktionieren noch
- Beim nächsten Speichern werden Bilder automatisch inline konvertiert
- Alte `.excalidraw.files` Ordner können manuell gelöscht werden

---

## Version 0.2.0 - 12/5/2025

### 🐛 Critical Bug Fix - Image Loading

#### ✅ **Bilder werden jetzt korrekt geladen:**

- **Problem behoben:** Bilder wurden in separaten `.excalidraw.files` Ordnern gespeichert, aber beim erneuten Laden der Notiz nicht korrekt angezeigt
  - Bildelemente waren ohne Dimensionen vorhanden
  - Bildinhalt wurde nicht dargestellt
  - Race Condition zwischen Excalidraw-Initialisierung und File-Loading

#### 🔧 **Technische Lösung:**

- **initialData API:** Migration von `excalidrawAPI.addFiles()` zu `initialData` Prop

  - Verwendet jetzt die offiziell empfohlene Methode von Excalidraw
  - Files werden synchron mit Elements geladen
  - Keine Race Conditions mehr
  - `key={currentNote}` Prop für korrektes Component Remounting

- **Code-Verbesserungen:**
  - State-Umstrukturierung: `sceneData` → `initialData`
  - Entfernung des problematischen `useEffect` für `updateScene()`
  - `isLoadingRef` zur Vermeidung von Mehrfachladungen
  - Verbessertes Logging für besseres Debugging

#### 📁 **Geänderte Dateien:**

- `src/components/Editor/Editor.tsx` - Komplette Refaktorierung der Bildlade-Logik
- `IMAGE_LOADING_FIX.md` - Ausführliche Dokumentation der Änderungen
- `package.json` - Version 0.2.0

#### 🎯 **Impact:**

- **Zuverlässiges Bildladen:** Bilder werden jetzt immer korrekt geladen und angezeigt
- **Bessere Performance:** Keine unnötigen Re-Renders oder doppelten API-Aufrufe
- **Dokumentiert:** Verwendet die offiziell empfohlene Methode von Excalidraw
- **Wartbar:** Einfacherer Code ohne komplexe State-Synchronisation

---

## Version 0.1.6 - 12/4/2025

### 🔧 CI/CD Fixes & Improvements

#### ✅ **GitHub Actions Release Workflow - Fixed:**

- **Release Creation Fixed:** GitHub Actions workflow now properly creates releases
  - Added `permissions: contents: write` to enable release creation
  - Fixed conditional to support manual workflow triggers (`workflow_dispatch`)
  - Releases now work both on push to main and manual triggers

#### 🚀 **Workflow Improvements:**

- **Manual Trigger Support:** Workflow can now be triggered manually from GitHub Actions
  - Previous: Only triggered on push, but release step was skipped on manual trigger
  - Now: Release is created on both push and manual trigger (unless test_build is true)
  - Better flexibility for release management

#### 🛡️ **Permissions & Security:**

- **Explicit Permissions:** Added workflow-level permissions for better security
  - `contents: write` permission explicitly granted
  - Follows GitHub's new security model requiring explicit permission declarations

### 📁 **Changed Files:**

- `.github/workflows/release.yml` - Permission block added, conditional updated
- `package.json` - Version bumped to 0.1.6

### 🎯 **Impact:**

- **Working Releases:** GitHub releases are now properly created with all platform artifacts
- **Better CI/CD:** More reliable and flexible release workflow
- **Security Compliance:** Follows GitHub Actions best practices for permissions

---

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
