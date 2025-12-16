/**
 * Sync-Typdefinitionen für ExcaliNote
 * CouchDB/PouchDB-basierte Synchronisation mit Class Notebook Unterstützung
 */

// ============================================================================
// Basis-Dokumenttypen für CouchDB
// ============================================================================

/** Basis-Dokument mit CouchDB-Metadaten */
export interface SyncDocument {
  _id: string;
  _rev?: string;
  _deleted?: boolean;
  _conflicts?: string[];
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  modifiedBy: string;
}

export type DocumentType = 'note' | 'folder' | 'notebook-metadata';

// ============================================================================
// Notiz-Dokument
// ============================================================================

/** Excalidraw-Inhalt einer Notiz */
export interface ExcalidrawContent {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: any[];
  appState: {
    gridSize?: number | null;
    viewBackgroundColor?: string;
    [key: string]: any;
  };
  files: Record<string, ExcalidrawFile>;
}

export interface ExcalidrawFile {
  mimeType: string;
  id: string;
  dataURL: string;
  created?: number;
  lastRetrieved?: number;
}

/** Notiz-Dokument für Synchronisation */
export interface NoteDocument extends SyncDocument {
  type: 'note';
  parentId: string | null;
  name: string;
  content: ExcalidrawContent;
  /** Für Class Notebooks: Zugriffsebene */
  accessLevel?: AccessLevel;
  /** Für Class Notebooks: Besitzer (bei Schüler-Ordnern) */
  ownerId?: string;
}

// ============================================================================
// Ordner-Dokument
// ============================================================================

/** Ordner-Typ für Class Notebooks */
export type FolderType =
  | 'standard'       // Normaler Ordner
  | 'student'        // Schüler-Ordner (Vollzugriff für Besitzer)
  | 'teacher'        // Lehrer-Materialien (readonly für Schüler)
  | 'preparation'    // Vorbereitung (kein Zugriff für Schüler)
  | 'collaboration'; // Gemeinsamer Bereich (Schreibzugriff für alle)

/** Ordner-Dokument für Synchronisation */
export interface FolderDocument extends SyncDocument {
  type: 'folder';
  parentId: string | null;
  name: string;
  /** Ordner-Typ für Berechtigungen */
  folderType: FolderType;
  /** Besitzer des Ordners (bei Schüler-Ordnern) */
  ownerId?: string;
  /** Sortierreihenfolge */
  sortOrder?: number;
}

// ============================================================================
// Notebook-Metadaten
// ============================================================================

/** Notebook-Typ */
export type NotebookType = 'personal' | 'class';

/** Class Notebook Konfiguration */
export interface ClassNotebookConfig {
  /** Lehrer-IDs mit Vollzugriff */
  teachers: string[];
  /** Schüler-IDs */
  students: string[];
  /** ID des Vorbereitungs-Ordners */
  preparationFolderId: string;
  /** ID des Kollaborations-Ordners */
  collaborationFolderId: string;
  /** ID des Lehrer-Material-Ordners */
  teacherMaterialFolderId: string;
}

/** Notebook-Metadaten-Dokument */
export interface NotebookMetadata extends SyncDocument {
  type: 'notebook-metadata';
  notebookId: string;
  notebookName: string;
  notebookType: NotebookType;
  /** Class Notebook Konfiguration (nur bei type='class') */
  classConfig?: ClassNotebookConfig;
  /** Einstellungen */
  settings?: {
    defaultTheme?: 'light' | 'dark';
    showGrid?: boolean;
  };
}

// ============================================================================
// Zugriffsrechte
// ============================================================================

export type AccessLevel = 'none' | 'readonly' | 'readwrite';

/** Benutzerrolle */
export type UserRole = 'admin' | 'teacher' | 'student';

/** Benutzer-Profil */
export interface UserProfile {
  _id: string;
  name: string;
  displayName: string;
  email?: string;
  roles: string[];
}

/** Aktuelle Benutzer-Session */
export interface UserSession {
  userId: string;
  username: string;
  displayName: string;
  roles: string[];
  isAuthenticated: boolean;
}

// ============================================================================
// Sync-Status und Konfiguration
// ============================================================================

export type SyncStatus =
  | 'disconnected'  // Nicht verbunden
  | 'connecting'    // Verbindung wird hergestellt
  | 'syncing'       // Synchronisation läuft
  | 'synced'        // Synchronisiert
  | 'paused'        // Pausiert (offline)
  | 'error';        // Fehler

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

/** Sync-Server-Konfiguration */
export interface SyncServerConfig {
  /** Server-URL (z.B. https://sync.example.com) */
  serverUrl: string;
  /** Datenbank-Name (wird automatisch generiert) */
  databaseName?: string;
  /** Benutzername */
  username: string;
  /** Passwort (wird nur temporär gespeichert) */
  password?: string;
}

/** Lokale Sync-Einstellungen */
export interface SyncSettings {
  /** Sync aktiviert */
  enabled: boolean;
  /** Server-Konfiguration */
  server: SyncServerConfig | null;
  /** Auto-Sync bei Änderungen */
  autoSync: boolean;
  /** Sync-Intervall in Millisekunden (für manuellen Sync) */
  syncInterval: number;
}

// ============================================================================
// Sync-Events
// ============================================================================

export type SyncEventType =
  | 'change'
  | 'paused'
  | 'active'
  | 'denied'
  | 'complete'
  | 'error';

export interface SyncChangeInfo {
  direction: 'push' | 'pull';
  change: {
    docs: SyncDocument[];
    docs_read: number;
    docs_written: number;
  };
}

export interface SyncError {
  status?: number;
  name: string;
  message: string;
  error?: boolean;
  reason?: string;
}

// ============================================================================
// Konflikt-Auflösung
// ============================================================================

export interface ConflictInfo {
  documentId: string;
  documentType: DocumentType;
  localVersion: SyncDocument;
  remoteVersion: SyncDocument;
  conflictRevisions: string[];
}

export type ConflictResolution = 'local' | 'remote' | 'merge';

// ============================================================================
// Migration
// ============================================================================

export interface MigrationProgress {
  total: number;
  current: number;
  currentItem: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
}

// ============================================================================
// Hilfsfunktionen für IDs
// ============================================================================

/** Generiert eine eindeutige ID für Dokumente */
export function generateDocId(prefix: 'note' | 'folder'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/** Erstellt die Datenbank-ID für ein Notebook */
export function getNotebookDbName(userId: string, notebookId?: string): string {
  if (notebookId) {
    return `excalinote_${notebookId}`;
  }
  return `excalinote_personal_${userId}`;
}

/** Erstellt die Datenbank-ID für ein Class Notebook */
export function getClassNotebookDbName(classId: string): string {
  return `excalinote_class_${classId}`;
}
