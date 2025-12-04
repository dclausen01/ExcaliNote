import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useNotebookStore } from '../../store/notebookStore';
import { FileText, Grid, Menu } from 'lucide-react';
import { logger } from '../../utils/logger';

interface EditorProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export default function Editor({ sidebarCollapsed, setSidebarCollapsed }: EditorProps) {
  const { currentNote, notebooks, saveNote, setTheme, isLoading } = useNotebookStore();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [sceneData, setSceneData] = useState<any>(null);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  // useRef für Debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        logger.error('Fehler beim Laden der Notiz', { currentNote, error });
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

  // Cleanup für Debouncing
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-Save: Änderungen automatisch speichern
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (!currentNote) return;

      // Theme-Tracking: Dark/Light Mode von Excalidraw erkennen
      if (appState.theme) {
        setTheme(appState.theme as 'light' | 'dark');
      }

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

      // Setze Status auf unsaved
      setSaveStatus('unsaved');

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save (500ms)
      saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await saveNote(currentNote, dataToSave);
          setSaveStatus('saved');
        } catch (error) {
          logger.error('Fehler beim Speichern', { currentNote, error });
          setSaveStatus('unsaved');
        }
      }, 500);
    },
    [currentNote, saveNote, setTheme]
  );

  // Grid Toggle Handler
  const toggleGrid = () => {
    setGridEnabled(!gridEnabled);
  };

  // Sidebar Toggle Handler
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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
      {/* Toolbar mit Grid Toggle, Save Status und Sidebar Toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition bg-gray-100 text-gray-700 hover:bg-gray-200"
          title={sidebarCollapsed ? 'Sidebar anzeigen' : 'Sidebar ausblenden'}
        >
          <Menu size={16} />
          <span>{sidebarCollapsed ? 'Sidebar öffnen' : 'Sidebar schließen'}</span>
        </button>
        
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
        
        {/* Save Status Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-sm text-gray-500">Speichert...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600">✓ Gespeichert</span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-sm text-orange-500">● Nicht gespeichert</span>
          )}
        </div>
        
        {/* Loading Indicator für Ordnerstruktur */}
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-500">Lade Ordnerstruktur...</span>
          </div>
        )}
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
