import { create } from 'zustand';
import type { NotebookStore, NotebookItem, FileSystemEntry } from '../types';

// Hilfsfunktion: Ordnerstruktur aus Datei-Liste aufbauen
function buildTree(entries: FileSystemEntry[], basePath: string = ''): NotebookItem[] {
  const items: NotebookItem[] = [];
  
  for (const entry of entries) {
    const item: NotebookItem = {
      id: entry.path,
      name: entry.name,
      path: entry.path,
      type: entry.isDirectory ? 'folder' : 'note',
    };
    
    items.push(item);
  }
  
  return items.sort((a, b) => {
    // Ordner zuerst, dann Notizen
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Alphabetisch sortieren
    return a.name.localeCompare(b.name, 'de');
  });
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
      return a.name.localeCompare(b.name, 'de');
    });
  } catch (error) {
    console.error('Fehler beim Laden des Ordners:', path, error);
    return [];
  }
}

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  currentNote: null,
  notebooks: [],
  baseDir: '',
  
  setCurrentNote: (path) => set({ currentNote: path }),
  
  setNotebooks: (notebooks) => set({ notebooks }),
  
  setBaseDir: (dir) => set({ baseDir: dir }),
  
  loadNotebooks: async () => {
    try {
      // Basis-Verzeichnis abrufen
      const baseDir = await window.electron.fs.getBaseDir();
      set({ baseDir });
      
      // Ordnerstruktur laden
      const notebooks = await loadFolderRecursive('');
      set({ notebooks });
    } catch (error) {
      console.error('Fehler beim Laden der Notizbücher:', error);
    }
  },
  
  createFolder: async (parentPath, name) => {
    try {
      const newPath = parentPath ? `${parentPath}/${name}` : name;
      await window.electron.fs.createDir(newPath);
      
      // Ordnerstruktur neu laden
      await get().loadNotebooks();
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error);
      throw error;
    }
  },
  
  createNote: async (parentPath, name) => {
    try {
      // Stelle sicher, dass der Name die .excalidraw-Erweiterung hat
      const noteName = name.endsWith('.excalidraw') ? name : `${name}.excalidraw`;
      const newPath = parentPath ? `${parentPath}/${noteName}` : noteName;
      
      // Erstelle eine leere Excalidraw-Datei
      const emptyData = {
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
      
      await window.electron.fs.writeFile(newPath, JSON.stringify(emptyData, null, 2));
      
      // Ordnerstruktur neu laden
      await get().loadNotebooks();
      
      // Neue Notiz öffnen
      set({ currentNote: newPath });
    } catch (error) {
      console.error('Fehler beim Erstellen der Notiz:', error);
      throw error;
    }
  },
  
  deleteItem: async (path) => {
    try {
      await window.electron.fs.delete(path);
      
      // Wenn die gelöschte Datei die aktuell geöffnete war, schließe sie
      if (get().currentNote === path) {
        set({ currentNote: null });
      }
      
      // Ordnerstruktur neu laden
      await get().loadNotebooks();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
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
      console.error('Fehler beim Umbenennen:', error);
      throw error;
    }
  },
  
  saveNote: async (path, data) => {
    try {
      await window.electron.fs.writeFile(path, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Fehler beim Speichern der Notiz:', error);
      throw error;
    }
  },
}));
