# Bildladen-Problem behoben

## Problem

Bilder wurden zwar in separaten `.excalidraw.files` Ordnern gespeichert, aber beim erneuten Laden der Notiz nicht korrekt angezeigt. Die Bildelemente waren ohne Dimensionen vorhanden, aber der Inhalt wurde nicht dargestellt.

## Ursache

Das Problem lag in der Art und Weise, wie die Bilder an Excalidraw übergeben wurden:

1. **Falscher API-Ansatz**: Die Bilder wurden mit `excalidrawAPI.addFiles()` nachträglich nach der Initialisierung hinzugefügt
2. **Timing-Problem**: Race Condition zwischen Excalidraw-Initialisierung und dem Hinzufügen der Files
3. **Inkonsistente Datenstruktur**: Die `files` wurden nicht synchron mit den `elements` geladen

## Lösung

### Änderungen in `src/components/Editor/Editor.tsx`:

1. **State-Umstrukturierung**:

   - `sceneData` State entfernt
   - `initialData` State hinzugefügt (enthält `elements`, `appState` und `files`)
   - `isExcalidrawReady` State entfernt (nicht mehr benötigt)

2. **Korrektes Laden**:

   ```typescript
   // Lade JSON-Datei mit elements und appState
   const content = await window.electron.fs.readFile(currentNote);
   const data = JSON.parse(content);

   // Lade Bilder separat aus dem .excalidraw.files Ordner
   const images = await loadImages(currentNote);

   // Kombiniere Scene-Daten mit Bildern für initialData
   const combinedData = {
     elements: data.elements || [],
     appState: data.appState || {},
     files: images,
   };

   setInitialData(combinedData);
   ```

3. **Direkte Übergabe über initialData Prop**:

   ```typescript
   <Excalidraw
     key={currentNote} // Wichtig: Komponente neu mounten bei Notizwechsel
     excalidrawAPI={handleExcalidrawAPI}
     onChange={handleChange}
     initialData={initialData} // Alle Daten inkl. Bilder
     // ... weitere Props
   />
   ```

4. **Key Prop für Remounting**:

   - Der `key={currentNote}` Prop stellt sicher, dass die Excalidraw-Komponente bei jedem Notizwechsel komplett neu gemountet wird
   - Dies garantiert, dass `initialData` korrekt geladen wird

5. **Entfernung des problematischen useEffect**:

   - Der useEffect, der `excalidrawAPI.updateScene()` und `addFiles()` aufgerufen hat, wurde entfernt
   - Diese API-Methoden sind für Live-Updates gedacht, nicht für initiales Laden

6. **Verbessertes Logging**:
   - Detailliertes Logging beim Laden der Notiz
   - Protokollierung der geladenen Bildanzahl und IDs
   - Besseres Debugging bei Problemen

## Technische Details

### Warum initialData statt API-Updates?

Laut Excalidraw-Dokumentation:

- `initialData` ist die empfohlene Methode für das initiale Laden von Daten
- Die Excalidraw API (`updateScene`, `addFiles`) ist für programmatische Änderungen NACH der Initialisierung gedacht
- `initialData` kann auch ein Promise sein, was asynchrones Laden ermöglicht
- Die `files` müssen gleichzeitig mit den `elements` geladen werden, die sie referenzieren

### BinaryFiles Struktur

Die `files` werden als BinaryFiles-Objekt übergeben:

```typescript
{
  [fileId: string]: {
    id: string;
    dataURL: string;  // Base64-codiertes Bild als Data-URL
    mimeType: string;
    created: number;
    lastRetrieved: number;
  }
}
```

### Speicherstruktur bleibt unverändert

Die Speicherstruktur bleibt wie bisher:

- Notiz-JSON: Enthält `elements` und `appState`, aber keine `files` (um Dateiduplikation zu vermeiden)
- `.excalidraw.files` Ordner: Enthält die Bilder als separate Dateien

## Testen

Um die Lösung zu testen:

1. Starte die Anwendung
2. Öffne eine Notiz
3. Füge ein Bild ein (z.B. via Copy & Paste oder Drag & Drop)
4. Das Bild sollte sofort sichtbar sein
5. Schließe die Notiz oder wechsle zu einer anderen
6. Öffne die Notiz erneut
7. Das Bild sollte nun korrekt geladen und angezeigt werden

## Zusätzliche Verbesserungen

- `isLoadingRef` hinzugefügt, um mehrfache gleichzeitige Ladeversuche zu verhindern
- Bessere Fehlerbehandlung mit aussagekräftigen Logs
- Konditionelles Rendering: Excalidraw wird nur gerendert, wenn `initialData` vorhanden ist

## Vorteile der neuen Implementierung

1. ✅ **Zuverlässig**: Keine Race Conditions mehr
2. ✅ **Dokumentiert**: Verwendet die offiziell empfohlene Methode von Excalidraw
3. ✅ **Wartbar**: Einfacherer Code ohne komplexe State-Synchronisation
4. ✅ **Performant**: Keine unnötigen Re-Renders oder doppelten API-Aufrufe
5. ✅ **Debuggbar**: Detailliertes Logging für Fehlersuche
