import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState } from '@excalidraw/excalidraw/types/types';

// Dateisystem-Einträge
export interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

// Notizbuch-Struktur
export interface NotebookItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'note';
  children?: NotebookItem[];
}

// Excalidraw-Daten
export interface ExcalidrawData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files?: Record<string, any>;
}

// Store-State
export interface NotebookStore {
  // Aktuell geöffnete Notiz
  currentNote: string | null;
  setCurrentNote: (path: string | null) => void;
  
  // Ordnerstruktur
  notebooks: NotebookItem[];
  setNotebooks: (notebooks: NotebookItem[]) => void;
  
  // Basis-Verzeichnis
  baseDir: string;
  setBaseDir: (dir: string) => void;
  
  // Theme für Dark/Light Mode
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Loading States
  isLoading: boolean;
  
  // Sidebar-State für Excalidraw Integration
  sidebarDocked: boolean;
  setSidebarDocked: (docked: boolean) => void;

  // Grid State
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  
  // Erweiterte Ordner für Tree-Navigation
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  
  // Laden der Ordnerstruktur
  loadNotebooks: () => Promise<void>;
  
  // Ordner erstellen
  createFolder: (parentPath: string, name: string) => Promise<void>;
  
  // Notiz erstellen
  createNote: (parentPath: string, name: string) => Promise<void>;
  
  // Löschen
  deleteItem: (path: string) => Promise<void>;
  
  // Umbenennen
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  
  // Notiz speichern
  saveNote: (path: string, data: any) => Promise<void>;
}
