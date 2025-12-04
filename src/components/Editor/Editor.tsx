import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useNotebookStore } from '../../store/notebookStore';
import { FileText, Grid, Menu, Sun, Moon } from 'lucide-react';
import { logger } from '../../utils/logger';
import { saveImages, loadImages, cleanupUnusedImages } from '../../utils/imageStorage';
import bannerImage from '../../assets/excalinotes_banner.png';

interface EditorProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export default function Editor({ sidebarCollapsed, setSidebarCollapsed }: EditorProps) {
  const { currentNote, notebooks, saveNote, setTheme, isLoading, theme } = useNotebookStore();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [sceneData, setSceneData] = useState<any>(null);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false);
  
  // useRef für Debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousElementsRef = useRef<readonly ExcalidrawElement[]>([]);

  // Excalidraw API bereit - safe update (inklusive Files/Bilder)
  useEffect(() => {
    if (excalidrawAPI && sceneData && isExcalidrawReady) {
      try {
        // Update Scene mit allen Daten inklusive Files
        excalidrawAPI.updateScene({
          elements: sceneData.elements,
          appState: sceneData.appState,
        });
        
        // Update Files separat, falls vorhanden
        if (sceneData.files && Object.keys(sceneData.files).length > 0) {
          excalidrawAPI.addFiles(Object.values(sceneData.files));
        }
      } catch (error) {
        logger.error('Fehler beim Aktualisieren der Excalidraw-Scene', { error });
      }
    }
  }, [excalidrawAPI, sceneData, isExcalidrawReady]);

  // Aktuelle Notiz laden
  useEffect(() => {
    const loadCurrentNote = async () => {
      if (!currentNote || !window.electron) return;

      try {
        const content = await window.electron.fs.readFile(currentNote);
        const data = JSON.parse(content);
        
        // Lade Bilder separat
        const images = await loadImages(currentNote);
        
        // Kombiniere Scene-Daten mit Bildern
        setSceneData({
          ...data,
          files: images
        });
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
  }, [currentNote]);

  // Cleanup für Debouncing
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-Save: Änderungen automatisch speichern (nur bei Canvas-Änderungen)
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (!currentNote) return;

      // Theme-Tracking: Dark/Light Mode von Excalidraw erkennen
      if (appState.theme) {
        setTheme(appState.theme as 'light' | 'dark');
      }

      // Prüfe ob sich die Elements tatsächlich geändert haben (nur bei Canvas-Änderungen speichern)
      const hasElementsChanged = elements.length !== previousElementsRef.current.length ||
        elements.some((element, index) => {
          const prevElement = previousElementsRef.current[index];
          return !prevElement || 
                 prevElement.x !== element.x ||
                 prevElement.y !== element.y ||
                 prevElement.width !== element.width ||
                 prevElement.height !== element.height ||
                 prevElement.type !== element.type;
        });

      // Nur bei tatsächlichen Element-Änderungen speichern, nicht bei Theme-Änderungen
      if (hasElementsChanged) {
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
            // Speichere Bilder separat
            await saveImages(currentNote, files);
            
            // Cleanup: Lösche ungenutzte Bilder
            await cleanupUnusedImages(currentNote, files);
            
            // Speichere Notiz ohne Bilder (nur Referenzen)
            const dataWithoutImages = {
              elements,
              appState: dataToSave.appState,
              files: {}, // Keine Bilder im JSON
            };
            
            await saveNote(currentNote, dataWithoutImages);
            setSaveStatus('saved');
            // Update previous elements reference nach erfolgreichem Speichern
            previousElementsRef.current = elements;
          } catch (error) {
            logger.error('Fehler beim Speichern', { currentNote, error });
            setSaveStatus('unsaved');
          }
        }, 500);
      }

      // Update previous elements reference
      previousElementsRef.current = elements;
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

  // Theme Toggle Handler
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    // Optional: Excalidraw Theme setzen
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        appState: { theme: newTheme }
      });
    }
  };

  // Excalidraw API Handler - sicherer callback
  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    try {
      setExcalidrawAPI(api);
      setIsExcalidrawReady(true);
    } catch (error) {
      logger.error('Fehler beim Initialisieren der Excalidraw API', { error });
      setIsExcalidrawReady(false);
    }
  }, []);

  if (!currentNote) {
    return (
      <div className={`flex-1 flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-[#2B2520] to-[#1F1B18]' 
          : 'bg-gradient-to-br from-[#F5F2E3] to-[#E8DFD0]'
      }`}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <img 
              src={bannerImage} 
              alt="ExcaliNote Banner" 
              className="mx-auto max-w-full h-auto opacity-90"
              style={{ maxHeight: '300px' }}
            />
          </div>
          <h1 className={`text-3xl font-bold mb-4 ${
            theme === 'dark' ? 'text-[#E8DFD0]' : 'text-[#3D3530]'
          }`}>
            Willkommen bei ExcaliNote
          </h1>
          <p className={`text-lg mb-6 ${
            theme === 'dark' ? 'text-[#C4B5A0]' : 'text-[#6B5D4F]'
          }`}>
            Deine OneNote-Alternative mit Excalidraw-Kern
          </p>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-[#A39988]' : 'text-[#8B7D6F]'
          }`}>
            Wähle eine Notiz aus dem linken Menü aus oder erstelle eine neue, um zu beginnen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col">
      {/* Toolbar mit Grid Toggle, Save Status, Sidebar Toggle und Theme Toggle */}
      <div className={`border-b px-4 py-2 flex items-center gap-4 ${
        theme === 'dark' 
          ? 'bg-[#1F1B18] border-[#3D3530]' 
          : 'bg-[#FDFBF7] border-[#E8E4DB]'
      }`}>
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
            theme === 'dark'
              ? 'bg-[#2B2520] text-[#E8DFD0] hover:bg-[#3D3530]'
              : 'bg-[#F5F2E3] text-[#3D3530] hover:bg-[#E8DFD0]'
          }`}
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
              : theme === 'dark'
                ? 'bg-[#2B2520] text-[#E8DFD0] hover:bg-[#3D3530]'
                : 'bg-[#F5F2E3] text-[#3D3530] hover:bg-[#E8DFD0]'
          }`}
          title="Grid anzeigen/ausblenden"
        >
          <Grid size={16} />
          <span>{gridEnabled ? 'Grid an' : 'Grid aus'}</span>
        </button>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
            theme === 'dark'
              ? 'bg-yellow-600 text-yellow-100 hover:bg-yellow-700'
              : 'bg-gray-700 text-gray-100 hover:bg-gray-800'
          }`}
          title={`${theme === 'light' ? 'Dunkles' : 'Helles'} Theme aktivieren`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        
        {/* Save Status Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>Speichert...</span>
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
            <span className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>Lade Ordnerstruktur...</span>
          </div>
        )}
      </div>

      {/* Excalidraw Editor */}
      <div className="flex-1">
        <Excalidraw
          excalidrawAPI={handleExcalidrawAPI}
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
