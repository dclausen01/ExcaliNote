import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw, Sidebar, Footer, MainMenu } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useNotebookStore } from '../../store/notebookStore';
import { FolderTree, Search } from 'lucide-react';
import { logger } from '../../utils/logger';
import { NotebookTreeIntegrated } from './NotebookTreeIntegrated';
import { SearchPanel } from './SearchPanel';
import './ExcalidrawOverrides.css';
import bannerImage from '../../assets/excalinotes_banner.png';

export default function Editor() {
  const { 
    currentNote, 
    saveNote, 
    setTheme, 
    isLoading, 
    theme,
    sidebarDocked,
    setSidebarDocked,
    loadNotebooks
  } = useNotebookStore();
  
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements?: ExcalidrawElement[];
    appState?: any;
    files?: BinaryFiles;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // useRef für Debouncing und Theme-Tracking
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousElementsRef = useRef<readonly ExcalidrawElement[]>([]);
  const loadedNoteRef = useRef<string | null>(null);
  const previousThemeRef = useRef<string | undefined>(undefined);

  // Initial: Notizbücher laden
  useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks]);

  // Aktuelle Notiz laden
  useEffect(() => {
    const loadCurrentNote = async () => {
      if (!currentNote || !window.electron) return;
      
      // Verhindere doppeltes Laden derselben Notiz
      if (loadedNoteRef.current === currentNote) return;
      
      loadedNoteRef.current = currentNote;
      
      try {
        logger.info('[Editor] Lade Notiz', { currentNote });
        
        // Lade JSON-Datei mit elements, appState UND files (Bilder inline)
        const content = await window.electron.fs.readFile(currentNote);
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

      // Theme-Tracking: Dark/Light Mode von Excalidraw erkennen
      const currentTheme = appState.theme;
      const themeChanged = previousThemeRef.current !== undefined && previousThemeRef.current !== currentTheme;
      
      if (currentTheme) {
        setTheme(currentTheme as 'light' | 'dark');
        previousThemeRef.current = currentTheme;
      }

      // Prüfe ob nur das Theme geändert wurde (keine echten Inhaltsänderungen)
      const elementsUnchanged = previousElementsRef.current === elements;
      const onlyThemeChanged = themeChanged && elementsUnchanged;

      // Wenn nur das Theme geändert wurde, überspringe das Speichern
      if (onlyThemeChanged) {
        logger.info('[Editor] Nur Theme geändert - kein Speichern nötig', { theme: currentTheme });
        return;
      }

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
    [currentNote, saveNote, setTheme]
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

  return (
    <div className="flex-1 h-full">
      {/* Render Excalidraw immer, auch ohne Notiz, damit die Sidebar sichtbar ist */}
      <Excalidraw
          key={currentNote}
          excalidrawAPI={handleExcalidrawAPI}
          onChange={handleChange}
          initialData={initialData}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: { saveFileToDisk: false },
              changeViewBackgroundColor: true,
            },
            dockedSidebarBreakpoint: 0,
          }}
          langCode="de"
          theme={theme}
        >
          {/* Navigation Sidebar (LINKS) */}
          <Sidebar name="navigation" docked={sidebarDocked}>
            <Sidebar.Trigger name="navigation">
              <FolderTree size={20} />
            </Sidebar.Trigger>
            <Sidebar.Header>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: 600,
                fontSize: '16px'
              }}>
                <span>📝</span>
                <span>ExcaliNote</span>
              </div>
            </Sidebar.Header>
            
            <Sidebar.Tabs>
              <Sidebar.Tab tab="notebooks">
                <NotebookTreeIntegrated />
              </Sidebar.Tab>
              
              <Sidebar.Tab tab="search">
                <SearchPanel />
              </Sidebar.Tab>
              
              <Sidebar.TabTriggers>
                <Sidebar.TabTrigger tab="notebooks">
                  <FolderTree size={18} />
                </Sidebar.TabTrigger>
                <Sidebar.TabTrigger tab="search">
                  <Search size={18} />
                </Sidebar.TabTrigger>
              </Sidebar.TabTriggers>
            </Sidebar.Tabs>
          </Sidebar>

          {/* Footer mit Notiz-Info */}
          <Footer>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '0 12px',
              fontSize: '13px',
              color: 'var(--color-on-surface-variant)'
            }}>
              <span>{getCurrentNoteName()}</span>
              {lastSaved && (
                <span>
                  Gespeichert: {formatTime(lastSaved)}
                </span>
              )}
              {saveStatus === 'saving' && (
                <span style={{ color: 'var(--color-primary)' }}>
                  Speichert...
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span style={{ color: 'var(--color-warning)' }}>
                  ● Nicht gespeichert
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
