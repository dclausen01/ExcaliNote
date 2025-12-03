# 🔄 ExcaliNote - Changelog

## Version 0.1.1 - 12/3/2025

### 🛠️ Bugfixes & Verbesserungen

#### ✅ **UI/UX Verbesserungen:**

- **Grid Togglebar:** Users können jetzt selbst steuern, ob ein Grid im Excalidraw angezeigt wird

  - Neue Toolbar mit Grid-Toggle-Button
  - Visueller Status: "Grid an"/"Grid aus"
  - Bessere Benutzerkontrolle über Canvas-Darstellung

- **Electron-Menü entfernt:** Komplettes Browser-Fenstermenü entfernt
  - Sauberere, fokussiertere App-Oberfläche
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
- `BUGFIXES.md` - Detaillierte Dokumentation aller Änderungen

### 🎉 **Ergebnis:**

- **Saubere UI:** Kein überflüssiges Menü mehr
- **User-Kontrolle:** Grid nach Wunsch ein-/ausblendbar
- **Korrekte Assets:** Banner und Icon funktionieren in allen Modi
- **Bessere UX:** Fokus auf funktionale Features statt Browsermenü

**Status:** ✅ Alle 5 gemeldeten Probleme vollständig gelöst!
