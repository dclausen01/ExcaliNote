# ExcaliNote Implementierung Todo

## 🎯 Hauptziele:

- [ ] **Banner-Asset-Pfad für Electron fixen** (von /assets/ zu src/assets/)
- [ ] **Save-Status Flipping Bug beheben** (Theme-Änderungen ignorieren)
- [ ] **Top Bar Dark Mode Support implementieren**
- [ ] **Dark/Light Mode Toggle Button zur Top Bar hinzufügen**
- [ ] **Testing der Implementierung**

---

## 📋 Detaillierte Schritte:

### SCHRITT 1: Banner-Asset Problem lösen

- [ ] Banner aus `/assets/` nach `src/assets/` verschieben
- [ ] Pfad in Editor.tsx anpassen (`/assets/excalinotes_banner.png` → `assets/excalinotes_banner.png`)
- [ ] Assets-Konfiguration in vite.config.ts prüfen

### SCHRITT 2: Save-Status Optimierung

- [ ] handleChange in Editor.tsx analysieren
- [ ] Theme-Änderungen vom Save-Status trennen
- [ ] Separates Theme-Tracking implementieren
- [ ] Save-Status nur bei tatsächlichen Canvas-Änderungen aktualisieren

### SCHRITT 3: Globaler Dark/Light Mode

- [ ] Theme-Support in App.tsx hinzufügen
- [ ] Theme-Kontext durch die App propagieren
- [ ] Top Bar CSS-Klassen für Dark Mode anpassen

### SCHRITT 4: Top Bar Dark Mode Toggle Button

- [ ] Sun/Moon Icon von lucide-react importieren
- [ ] Toggle Button in Top Bar implementieren
- [ ] Theme-Wechsel über useNotebookStore
- [ ] Button-Styling für Dark/Light Mode

### SCHRITT 5: Integration & Testing

- [ ] Theme-Konsistenz zwischen Top Bar und Excalidraw
- [ ] Save-Status Flipping testen
- [ ] Banner-Anzeige in Welcome-Screen testen
- [ ] Electron-Build testen

---

## 🔧 Technische Details:

### Banner Asset-Pfade:

- **Development**: `src/assets/` (Vite bundled)
- **Production**: Vite bundled assets in dist/

### Save-Status Optimierung:

- **Problem**: Theme-Änderungen triggern unnötige Speicher-Status-Updates
- **Lösung**: Theme-Änderungen separate behandeln, nur Canvas-Änderungen speichern

### Dark Mode Architektur:

- **Global State**: `useNotebookStore` theme property
- **UI Components**: Theme-aware CSS-Klassen
- **Sync**: Excalidraw theme ↔ App theme
