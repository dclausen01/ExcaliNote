import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw, Footer, MainMenu } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { Loader2 } from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';
import { useSyncStore } from '../../store/syncStore';
import { logger } from '../../utils/logger';
import './ExcalidrawOverrides.css';
import bannerImage from '../../assets/excalinotes_banner.png';

export default function Editor() {
  const { 
    currentNote, 
    saveNote, 
    setTheme, 
    theme,
    loadNotebooks,
    showGrid
  } = useNotebookStore();
  
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

  // Sync grid state with Excalidraw
  useEffect(() => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        appState: {
          gridSize: showGrid ? 20 : null
        }
      });
    }
  }, [excalidrawAPI, showGrid]);
  const [initialData, setInitialData] = useState<{
    elements?: ExcalidrawElement[];
    appState?: any;
    files?: BinaryFiles;
  } | null>(null);
  const [loadedNotePath, setLoadedNotePath] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // useRef für Debouncing und Theme-Tracking
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousElementsRef = useRef<readonly ExcalidrawElement[]>([]);
  const loadedNoteRef = useRef<string | null>(null);
  const previousThemeRef = useRef<string | undefined>(undefined);

  // Sync-Store für Datei-Updates
  const { lastSyncUpdate } = useSyncStore();

  // Initial: Notizbücher laden
  useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks]);

  // Notizbücher neu laden wenn Sync-Update erfolgt
  useEffect(() => {
    if (lastSyncUpdate > 0) {
      logger.info('Sync-Update erkannt, lade Notizbücher neu');
      loadNotebooks();
    }
  }, [lastSyncUpdate, loadNotebooks]);

  // Aktuelle Notiz laden
  useEffect(() => {
    const loadCurrentNote = async () => {
      if (!currentNote || !window.electron) return;
      
      // Reset status on note switch
      setSaveStatus('saved');
      setLastSaved(null);
      
      // Verhindere doppeltes Laden derselben Notiz
      if (loadedNoteRef.current === currentNote) return;
      
      loadedNoteRef.current = currentNote;
      
      try {
        logger.info('[Editor] Lade Notiz', { currentNote });
        
        // Lade JSON-Datei mit elements, appState UND files (Bilder inline)
        const content = await window.electron.fs.readFile(currentNote);
        
        // RACE CONDITION CHECK: 
        // Prüfe ob die geladene Notiz noch immer die aktuell ausgewählte ist.
        // Wenn der User inzwischen gewechselt hat, verwerfen wir das Ergebnis.
        if (currentNote !== loadedNoteRef.current) {
          logger.info('[Editor] Ladevorgang verworfen - User hat bereits gewechselt', { 
            loaded: currentNote, 
            current: loadedNoteRef.current 
          });
          return;
        }

        const data = JSON.parse(content);
        
        logger.info('[Editor] Notiz-Daten geladen', { 
          elementCount: data.elements?.length || 0,
          fileCount: Object.keys(data.files || {}).length,
          currentNote 
        });
        
        // Excalidraw-Standard: files sind bereits in der JSON-Datei enthalten
        setInitialData({
          elements: data.elements || [],
          appState: data.appState || {},
          files: data.files || {}
        });
        setLoadedNotePath(currentNote);
        
        logger.info('[Editor] InitialData gesetzt', { 
          elementCount: data.elements?.length || 0,
          fileCount: Object.keys(data.files || {}).length,
          currentNote 
        });
      } catch (error) {
        logger.error('[Editor] Fehler beim Laden der Notiz', { currentNote, error });
        // Neue leere Notiz
        setInitialData({
          elements: [],
          appState: {},
          files: {}
        });
        setLoadedNotePath(currentNote);
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

  // Auto-Save: Änderungen automatisch speichern
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (!currentNote) return;

      // Speichere bei echten Inhaltsänderungen
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
          // Excalidraw-Standard: Speichere alles inline in der JSON-Datei
          const dataToSaveComplete = {
            elements,
            appState: dataToSave.appState,
            files,
          };
          
          await saveNote(currentNote, dataToSaveComplete);
          setSaveStatus('saved');
          setLastSaved(new Date());
          logger.info('[Editor] Notiz gespeichert', { 
            currentNote,
            elementCount: elements.length,
            fileCount: Object.keys(files).length
          });
          
          previousElementsRef.current = elements;
        } catch (error) {
          logger.error('[Editor] Fehler beim Speichern', { currentNote, error });
          setSaveStatus('unsaved');
        }
      }, 500);

      previousElementsRef.current = elements;
    },
    [currentNote, saveNote, setTheme, theme]
  );

  // Excalidraw API Handler
  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    try {
      setExcalidrawAPI(api);
      logger.info('[Editor] Excalidraw API initialisiert');
    } catch (error) {
      logger.error('[Editor] Fehler beim Initialisieren der Excalidraw API', { error });
    }
  }, []);

  // Format Time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get current note name
  const getCurrentNoteName = () => {
    if (!currentNote) return 'Keine Notiz ausgewählt';
    const parts = currentNote.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace('.excalidraw', '');
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#121212]' : 'bg-white';

  if (!currentNote) {
    return (
      <div className={`flex-1 h-full flex items-center justify-center ${bgColor}`}>
        <img 
          src={bannerImage} 
          alt="ExcaliNote" 
          className="max-w-lg w-full px-8 opacity-80 object-contain" 
        />
      </div>
    );
  }

  // Zeige Loading-Screen wenn Daten noch nicht für die aktuelle Notiz bereit sind
  if (currentNote !== loadedNotePath) {
    const textColor = isDark ? 'text-gray-400' : 'text-gray-500';
    
    return (
       <div className={`flex-1 h-full flex items-center justify-center ${bgColor}`}>
         <div className={`flex flex-col items-center gap-2 ${textColor}`}>
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm">Lade Notiz...</span>
         </div>
       </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <Excalidraw
          key={currentNote}
          excalidrawAPI={handleExcalidrawAPI}
          onChange={handleChange}
          initialData={initialData}
          validateEmbeddable={(url) => {
            // Erlaube alle http/https URLs für Web Embeds (nicht nur bekannte Domains)
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
              return true;
            }
            return false;
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: { saveFileToDisk: false },
              changeViewBackgroundColor: true,
            },
          }}
          langCode="de"
          theme={theme}
        >
          {/* Footer mit Notiz-Info */}
          <Footer>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '0 12px',
              fontSize: '13px',
              color: isDark ? '#e5e5e5' : '#171717'
            }}>
              <span>{getCurrentNoteName()}</span>
              {lastSaved && (
                <span>
                  Gespeichert: {formatTime(lastSaved)}
                </span>
              )}
              {saveStatus === 'saving' && (
                <span style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>
                  Speichert...
                </span>
              )}
            </div>
          </Footer>

          {/* Angepasstes MainMenu */}
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.Export />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.Help />
          </MainMenu>
        </Excalidraw>
    </div>
  );
}
