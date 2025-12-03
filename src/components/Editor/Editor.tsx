import { useEffect, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { useNotebookStore } from '../../store/notebookStore';
import { FileText } from 'lucide-react';

export default function Editor() {
  const { currentNote, notebooks, saveNote } = useNotebookStore();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [sceneData, setSceneData] = useState<any>(null);

  // Aktuelle Notiz laden
  useEffect(() => {
    const loadCurrentNote = async () => {
      if (!currentNote || !window.electron) return;

      try {
        const content = await window.electron.fs.readFile(currentNote);
        const data = JSON.parse(content);
        setSceneData(data);
        
        // Excalidraw Scene aktualisieren
        if (excalidrawAPI) {
          excalidrawAPI.updateScene(data);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Notiz:', error);
        // Neue leere Notiz
        setSceneData({
          elements: [],
          appState: {},
          files: {}
        });
      }
    };

    loadCurrentNote();
  }, [currentNote, excalidrawAPI]);

  // Auto-Save: Änderungen automatisch speichern
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (!currentNote) return;

      const dataToSave = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          currentItemFontSize: appState.currentItemFontSize,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
          currentItemFillStyle: appState.currentItemFillStyle,
          currentItemStrokeWidth: appState.currentItemStrokeWidth,
          currentItemRoughness: appState.currentItemRoughness,
          currentItemOpacity: appState.currentItemOpacity,
        },
        files,
      };

      // Debounced save (500ms)
      const timeoutId = setTimeout(() => {
        saveNote(currentNote, dataToSave);
      }, 500);

      return () => clearTimeout(timeoutId);
    },
    [currentNote, saveNote]
  );

  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-400">
          <FileText size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Wähle eine Notiz aus oder erstelle eine neue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        initialData={sceneData}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: { saveFileToDisk: false },
            changeViewBackgroundColor: true,
          },
        }}
      />
    </div>
  );
}
