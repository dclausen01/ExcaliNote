import { create } from 'zustand';
import type { NotebookStore, NotebookItem, FileSystemEntry } from '../types';
import { logger } from '../utils/logger';
import { syncService } from '../services/syncService';
import { generateDocId } from '../types/sync';
import type { NoteDocument, FolderDocument, ExcalidrawContent } from '../types/sync';

// Map von Dateipfad zu PouchDB Document-ID
const pathToDocId = new Map<string, string>();

// Hilfsfunktion: Generiert eine konsistente Doc-ID aus einem Pfad
function getOrCreateDocId(path: string, type: 'note' | 'folder'): string {
  if (pathToDocId.has(path)) {
    return pathToDocId.get(path)!;
  }
  const docId = generateDocId(type);
  pathToDocId.set(path, docId);
  return docId;
}

// Hilfsfunktion: Parent-Ordner-ID aus Pfad ermitteln
function getParentDocId(path: string): string | null {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return null;
  const parentPath = path.substring(0, lastSlash);
  return pathToDocId.get(parentPath) || null;
}

// Hilfsfunktion: Pfade sicher zusammenfügen
export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

// Rekursiv Ordnerstruktur laden
async function loadFolderRecursive(path: string): Promise<NotebookItem[]> {
  try {
    const entries = await window.electron.fs.readDir(path) as FileSystemEntry[];
    const items: NotebookItem[] = [];
    
    for (const entry of entries) {
      const item: NotebookItem = {
        id: entry.path,
        name: entry.name,
        path: entry.path,
        type: entry.isDirectory ? 'folder' : 'note',
      };
      
      // Rekursiv Unterordner laden
      if (entry.isDirectory) {
        item.children = await loadFolderRecursive(entry.path);
      }
      
      items.push(item);
    }
    
    return items.sort((a, b) => {
      // Ordner zuerst, dann Notizen
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // Alphabetisch sortieren
      return a.name.localeCompare(a.name, 'de');
    });
  } catch (error) {
    logger.error('Fehler beim Laden des Ordners', { path, error });
    return [];
  }
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  currentNote: null,
  notebooks: [],
  baseDir: '',
  theme: 'light',
  isLoading: false,
  sidebarDocked: true,
  showGrid: false,
  expandedFolders: new Set<string>(),
  renamingPath: null,
  
  setRenamingPath: (path) => set({ renamingPath: path }),
  
  setCurrentNote: (path) => set({ currentNote: path }),
  
  setNotebooks: (notebooks) => set({ notebooks }),
  
  setBaseDir: (dir) => set({ baseDir: dir }),
  
  setTheme: (theme) => set({ theme }),
  
  setSidebarDocked: (docked) => set({ sidebarDocked: docked }),

  setShowGrid: (show) => set({ showGrid: show }),
  
  toggleFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    return { expandedFolders: newExpanded };
  }),
  
  loadNotebooks: async () => {
    set({ isLoading: true });
    try {
      // Basis-Verzeichnis abrufen
      const baseDir = await window.electron.fs.getBaseDir();
      set({ baseDir });
      
      // Ordnerstruktur laden
      const notebooks = await loadFolderRecursive('');
      set({ notebooks, isLoading: false });
    } catch (error) {
      logger.error('Fehler beim Laden der Notizbücher', { error });
      set({ isLoading: false });
    }
  },
  
  createFolder: async (parentPath, name) => {
    try {
      const newPath = joinPath(parentPath, name);

      // 1. Im Dateisystem erstellen
      await window.electron.fs.createDir(newPath);

      // 2. In PouchDB speichern (für Synchronisation)
      try {
        const docId = getOrCreateDocId(newPath, 'folder');

        const folderDoc: Omit<FolderDocument, '_rev'> = {
          _id: docId,
          type: 'folder',
          name: name,
          parentId: getParentDocId(newPath),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'local',
          modifiedBy: 'local',
        };

        await syncService.saveFolder(folderDoc);
        logger.debug('Neuer Ordner in PouchDB erstellt', { newPath, docId });
      } catch (syncError) {
        logger.warn('Fehler beim Erstellen in PouchDB', { newPath, error: syncError });
      }

      // Ordnerstruktur neu laden
      await get().loadNotebooks();

      // Parent Folder expanden
      if (parentPath) {
        const newExpanded = new Set(get().expandedFolders);
        newExpanded.add(parentPath);
        set({ expandedFolders: newExpanded });
      }

      // Rename Mode aktivieren
      set({ renamingPath: newPath });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Ordners', { parentPath, name, error });
      throw error;
    }
  },
  
  createNote: async (parentPath, name) => {
    try {
      // Stelle sicher, dass der Name die .excalidraw-Erweiterung hat
      const noteName = name.endsWith('.excalidraw') ? name : `${name}.excalidraw`;
      const newPath = joinPath(parentPath, noteName);

      // Erstelle eine leere Excalidraw-Datei
      const emptyData: ExcalidrawContent = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalinote.app',
        elements: [],
        appState: {
          gridSize: null,
          viewBackgroundColor: '#ffffff',
        },
        files: {},
      };

      // 1. Im Dateisystem speichern
      await window.electron.fs.writeFile(newPath, JSON.stringify(emptyData, null, 2));

      // 2. In PouchDB speichern (für Synchronisation)
      try {
        const docId = getOrCreateDocId(newPath, 'note');
        const displayName = name.replace('.excalidraw', '');

        const noteDoc: Omit<NoteDocument, '_rev'> = {
          _id: docId,
          type: 'note',
          name: displayName,
          parentId: getParentDocId(newPath),
          content: emptyData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'local',
          modifiedBy: 'local',
        };

        await syncService.saveNote(noteDoc);
        logger.debug('Neue Notiz in PouchDB erstellt', { newPath, docId });
      } catch (syncError) {
        logger.warn('Fehler beim Erstellen in PouchDB', { newPath, error: syncError });
      }

      // Ordnerstruktur neu laden
      await get().loadNotebooks();

      // Parent Folder expanden
      if (parentPath) {
        const newExpanded = new Set(get().expandedFolders);
        newExpanded.add(parentPath);
        set({ expandedFolders: newExpanded });
      }

      // Rename Mode aktivieren
      set({ renamingPath: newPath });

      // Neue Notiz öffnen
      set({ currentNote: newPath });
    } catch (error) {
      logger.error('Fehler beim Erstellen der Notiz', { parentPath, name, error });
      throw error;
    }
  },
  
  deleteItem: async (path) => {
    try {
      await window.electron.fs.delete(path);
      
      // Wenn die gelöschte Datei die aktuell geöffnete war (oder darin enthalten war), schließe sie
      const currentNote = get().currentNote;
      if (currentNote && (currentNote === path || currentNote.startsWith(path + '/'))) {
        set({ currentNote: null });
      }
      
      // Ordnerstruktur neu laden
      await get().loadNotebooks();
    } catch (error) {
      logger.error('Fehler beim Löschen', { path, error });
      throw error;
    }
  },
  
  renameItem: async (oldPath, newPath) => {
    try {
      await window.electron.fs.rename(oldPath, newPath);
      
      // Wenn die umbenannte Datei die aktuell geöffnete war, aktualisiere den Pfad
      if (get().currentNote === oldPath) {
        set({ currentNote: newPath });
      }
      
      // Ordnerstruktur neu laden
      await get().loadNotebooks();
    } catch (error) {
      logger.error('Fehler beim Umbenennen', { oldPath, newPath, error });
      throw error;
    }
  },
  
  saveNote: async (path, data) => {
    try {
      // 1. Im Dateisystem speichern (für lokale Nutzung)
      await window.electron.fs.writeFile(path, JSON.stringify(data, null, 2));

      // 2. In PouchDB speichern (für Synchronisation)
      try {
        const docId = getOrCreateDocId(path, 'note');
        const fileName = path.split('/').pop()?.replace('.excalidraw', '') || 'Unbenannt';

        const noteDoc: Omit<NoteDocument, '_rev'> = {
          _id: docId,
          type: 'note',
          name: fileName,
          parentId: getParentDocId(path),
          content: data as ExcalidrawContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'local',
          modifiedBy: 'local',
        };

        await syncService.saveNote(noteDoc);
        logger.debug('Notiz in PouchDB gespeichert', { path, docId });
      } catch (syncError) {
        // Sync-Fehler loggen, aber nicht werfen - lokales Speichern hat funktioniert
        logger.warn('Fehler beim Speichern in PouchDB', { path, error: syncError });
      }
    } catch (error) {
      logger.error('Fehler beim Speichern der Notiz', { path, error });
      throw error;
    }
  },
}));
