import { useEffect, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { useNotebookStore } from '../../store/notebookStore';
import { FileText, Grid } from 'lucide-react';

export default function Editor() {
  const { currentNote, notebooks, saveNote } = useNotebookStore();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [sceneData, setSceneData] = useState<any>(null);
  const [gridEnabled, setGridEnabled] = useState(false);

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

  // Grid Toggle Handler
  const toggleGrid = () => {
    setGridEnabled(!gridEnabled);
  };

  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <img 
              src="/assets/excalinotes_banner.png" 
              alt="ExcaliNote Banner" 
              className="mx-auto max-w-full h-auto opacity-90"
              style={{ maxHeight: '300px' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Willkommen bei ExcaliNote</h1>
          <p className="text-lg text-gray-600 mb-6">
            Deine OneNote-Alternative mit Excalidraw-Kern
          </p>
          <p className="text-sm text-gray-500">
            Wähle eine Notiz aus dem linken Menü aus oder erstelle eine neue, um zu beginnen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col">
      {/* Toolbar mit Grid Toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        <button
          onClick={toggleGrid}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
            gridEnabled 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Grid anzeigen/ausblenden"
        >
          <Grid size={16} />
          <span>{gridEnabled ? 'Grid an' : 'Grid aus'}</span>
        </button>
      </div>

      {/* Excalidraw Editor */}
      <div className="flex-1">
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
          langCode="de"
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={gridEnabled}
        />
      </div>
    </div>
  );
}
