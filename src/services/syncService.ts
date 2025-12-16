/**
 * SyncService - PouchDB/CouchDB Synchronisation für ExcaliNote
 *
 * Dieser Service verwaltet die lokale PouchDB-Datenbank und die
 * Synchronisation mit einem entfernten CouchDB-Server.
 */

import type {
  SyncDocument,
  NoteDocument,
  FolderDocument,
  NotebookMetadata,
  SyncState,
  SyncServerConfig,
  SyncSettings,
  SyncStatus,
  SyncChangeInfo,
  SyncError,
  ConflictInfo,
  ExcalidrawContent,
  FolderType,
} from '../types/sync';
import { logger } from '../utils/logger';

// ============================================================================
// PouchDB Lazy Loading
// ============================================================================

let PouchDBModule: any = null;

async function loadPouchDB(): Promise<any> {
  if (PouchDBModule) return PouchDBModule;

  try {
    // Verwende pouchdb-browser für Electron/Browser-Umgebungen
    const pouchdb = await import('pouchdb-browser');
    const pouchdbFind = await import('pouchdb-find');
    PouchDBModule = pouchdb.default || pouchdb;
    PouchDBModule.plugin(pouchdbFind.default || pouchdbFind);
    return PouchDBModule;
  } catch (error) {
    logger.error('Fehler beim Laden von PouchDB', { error });
    throw error;
  }
}

// ============================================================================
// Passwort-Verschlüsselung (einfache Obfuskation)
// ============================================================================

const CREDENTIAL_KEY = 'excalinote_sync_credentials';

function encryptPassword(password: string): string {
  // Einfache Base64-Kodierung mit Prefix für Erkennbarkeit
  return 'enc:' + btoa(unescape(encodeURIComponent(password)));
}

function decryptPassword(encrypted: string): string {
  if (!encrypted.startsWith('enc:')) {
    return encrypted; // Nicht verschlüsselt (Legacy)
  }
  try {
    return decodeURIComponent(escape(atob(encrypted.slice(4))));
  } catch {
    return '';
  }
}

function saveCredentials(serverUrl: string, username: string, password: string): void {
  try {
    const credentials = {
      serverUrl,
      username,
      password: encryptPassword(password),
    };
    localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(credentials));
  } catch (error) {
    logger.warn('Fehler beim Speichern der Anmeldedaten', { error });
  }
}

function loadCredentials(): { serverUrl: string; username: string; password: string } | null {
  try {
    const stored = localStorage.getItem(CREDENTIAL_KEY);
    if (stored) {
      const credentials = JSON.parse(stored);
      return {
        serverUrl: credentials.serverUrl,
        username: credentials.username,
        password: decryptPassword(credentials.password),
      };
    }
  } catch (error) {
    logger.warn('Fehler beim Laden der Anmeldedaten', { error });
  }
  return null;
}

function clearCredentials(): void {
  try {
    localStorage.removeItem(CREDENTIAL_KEY);
  } catch (error) {
    logger.warn('Fehler beim Löschen der Anmeldedaten', { error });
  }
}

// ============================================================================
// Typen für PouchDB
// ============================================================================

type PouchDBDatabase = any;
type SyncHandler = any;

// ============================================================================
// Event-Typen
// ============================================================================

type SyncEventCallback = (state: SyncState) => void;
type ChangeEventCallback = (docs: SyncDocument[]) => void;
type ConflictEventCallback = (conflict: ConflictInfo) => void;

interface SyncServiceEvents {
  onStateChange: SyncEventCallback[];
  onChange: ChangeEventCallback[];
  onConflict: ConflictEventCallback[];
}

// ============================================================================
// SyncService Klasse
// ============================================================================

class SyncService {
  private localDB: PouchDBDatabase | null = null;
  private remoteDB: PouchDBDatabase | null = null;
  private syncHandler: SyncHandler | null = null;
  private settings: SyncSettings;
  private state: SyncState;
  private events: SyncServiceEvents;
  private isInitialized: boolean = false;

  constructor() {
    this.settings = this.loadSettings();
    this.state = {
      status: 'disconnected',
      lastSyncedAt: null,
      pendingChanges: 0,
      error: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
    this.events = {
      onStateChange: [],
      onChange: [],
      onConflict: [],
    };

    // Online/Offline-Events überwachen
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineStatusChange(true));
      window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    }
  }

  // ==========================================================================
  // Initialisierung
  // ==========================================================================

  /**
   * Initialisiert die lokale Datenbank
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // PouchDB lazy laden
      const PouchDB = await loadPouchDB();

      // Lokale Datenbank erstellen (IndexedDB im Browser/Electron)
      this.localDB = new PouchDB('excalinote_local') as PouchDBDatabase;

      // Indizes für effiziente Abfragen erstellen
      await this.createIndexes();

      this.isInitialized = true;
      logger.info('SyncService initialisiert');

      // Automatische Verbindung mit gespeicherten Anmeldedaten
      if (this.settings.enabled) {
        const credentials = loadCredentials();
        if (credentials && credentials.password) {
          // Verbinde mit gespeicherten Anmeldedaten
          await this.connect({
            serverUrl: credentials.serverUrl,
            username: credentials.username,
            password: credentials.password,
          });
        } else if (this.settings.server) {
          // Fallback: Versuche ohne Passwort (wird fehlschlagen, aber zeigt Status)
          logger.warn('Keine gespeicherten Anmeldedaten gefunden');
        }
      }
    } catch (error) {
      logger.error('Fehler bei SyncService-Initialisierung', { error });
      // Fehler beim Auto-Connect nicht werfen, App soll trotzdem starten
    }
  }

  /**
   * Erstellt Datenbank-Indizes für effiziente Abfragen
   */
  private async createIndexes(): Promise<void> {
    if (!this.localDB) return;

    try {
      // Index für Typ und ParentId
      await this.localDB.createIndex({
        index: {
          fields: ['type', 'parentId'],
          name: 'type-parent-idx',
        },
      });

      // Index für Typ allein
      await this.localDB.createIndex({
        index: {
          fields: ['type'],
          name: 'type-idx',
        },
      });

      // Index für ownerId (Class Notebooks)
      await this.localDB.createIndex({
        index: {
          fields: ['ownerId'],
          name: 'owner-idx',
        },
      });
    } catch (error) {
      // Ignoriere Fehler, falls Indizes bereits existieren
      logger.debug('Index-Erstellung:', { error });
    }
  }

  // ==========================================================================
  // Verbindung
  // ==========================================================================

  /**
   * Verbindet mit einem CouchDB-Server
   */
  async connect(config: SyncServerConfig): Promise<void> {
    if (!this.localDB) {
      await this.initialize();
    }

    this.updateState({ status: 'connecting', error: null });

    try {
      const PouchDB = await loadPouchDB();
      const dbUrl = this.buildDatabaseUrl(config);

      // Remote-Datenbank mit Authentifizierung
      this.remoteDB = new PouchDB(dbUrl, {
        skip_setup: true,
        auth: config.username && config.password ? {
          username: config.username,
          password: config.password,
        } : undefined,
      }) as PouchDBDatabase;

      // Verbindung testen
      await this.remoteDB.info();

      // Anmeldedaten sicher speichern (mit Passwort!)
      if (config.password) {
        saveCredentials(config.serverUrl, config.username, config.password);
      }

      // Einstellungen speichern (ohne Passwort in den Einstellungen)
      this.settings.server = {
        ...config,
        password: undefined,
      };
      this.settings.enabled = true;
      this.saveSettings();

      // Live-Sync starten
      this.startSync();

      // Status auf "synced" setzen (Verbindung erfolgreich)
      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });

      logger.info('Verbindung hergestellt', { serverUrl: config.serverUrl });
    } catch (error: any) {
      const syncError: SyncError = {
        name: error.name || 'ConnectionError',
        message: error.message || 'Verbindung fehlgeschlagen',
        status: error.status,
      };

      this.updateState({
        status: 'error',
        error: syncError.message,
      });

      logger.error('Verbindungsfehler', { error: syncError });
      throw error;
    }
  }

  /**
   * Trennt die Verbindung zum Server
   */
  disconnect(): void {
    this.stopSync();

    if (this.remoteDB) {
      this.remoteDB.close();
      this.remoteDB = null;
    }

    // Anmeldedaten löschen
    clearCredentials();

    this.settings.enabled = false;
    this.settings.server = null;
    this.saveSettings();

    this.updateState({
      status: 'disconnected',
      error: null,
    });

    logger.info('Verbindung getrennt');
  }

  /**
   * Baut die Datenbank-URL zusammen
   */
  private buildDatabaseUrl(config: SyncServerConfig): string {
    const baseUrl = config.serverUrl.replace(/\/$/, '');
    const dbName = config.databaseName || `excalinote_personal_${config.username}`;
    return `${baseUrl}/${dbName}`;
  }

  // ==========================================================================
  // Synchronisation
  // ==========================================================================

  /**
   * Startet die Live-Synchronisation
   */
  private startSync(): void {
    if (!this.localDB || !this.remoteDB) return;

    this.stopSync(); // Bestehende Sync stoppen

    this.syncHandler = this.localDB.sync(this.remoteDB, {
      live: true,
      retry: true,
      // Batch-Größe für Performance
      batch_size: 50,
      batches_limit: 10,
    })
      .on('change', (info: any) => this.handleSyncChange(info))
      .on('paused', (err: any) => this.handleSyncPaused(err))
      .on('active', () => this.handleSyncActive())
      .on('denied', (err: any) => this.handleSyncDenied(err))
      .on('complete', (info: any) => this.handleSyncComplete(info))
      .on('error', (err: any) => this.handleSyncError(err));

    logger.info('Live-Sync gestartet');
  }

  /**
   * Stoppt die Synchronisation
   */
  private stopSync(): void {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
  }

  /**
   * Erzwingt eine einmalige Synchronisation
   */
  async forceSync(): Promise<void> {
    if (!this.localDB || !this.remoteDB) {
      throw new Error('Nicht verbunden');
    }

    this.updateState({ status: 'syncing' });

    try {
      await this.localDB.sync(this.remoteDB);
      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      this.updateState({
        status: 'error',
        error: error.message,
      });
      throw error;
    }
  }

  // ==========================================================================
  // Sync-Event-Handler
  // ==========================================================================

  private handleSyncChange(info: any): void {
    const changeInfo: SyncChangeInfo = {
      direction: info.direction,
      change: {
        docs: info.change.docs || [],
        docs_read: info.change.docs_read || 0,
        docs_written: info.change.docs_written || 0,
      },
    };

    const docsCount = changeInfo.change.docs.length;

    // Benachrichtige Listener über geänderte Dokumente
    if (docsCount > 0) {
      this.emitChange(changeInfo.change.docs);
    }

    // Prüfe auf Konflikte
    this.checkForConflicts(changeInfo.change.docs);

    logger.debug('Sync-Änderung', {
      direction: changeInfo.direction,
      docs: docsCount,
    });
  }

  private handleSyncPaused(err: any): void {
    if (err) {
      logger.warn('Sync pausiert mit Fehler', { error: err });
      this.updateState({
        status: 'paused',
        error: err.message,
      });
    } else {
      // Erfolgreich synchronisiert und pausiert (wartet auf Änderungen)
      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
    }
  }

  private handleSyncActive(): void {
    // 'active' bedeutet, dass Daten übertragen werden
    this.updateState({ status: 'syncing' });
    logger.debug('Sync aktiv - Datenübertragung läuft');
  }

  private handleSyncDenied(err: any): void {
    logger.error('Sync verweigert', { error: err });
    this.updateState({
      status: 'error',
      error: 'Zugriff verweigert: ' + (err.message || 'Keine Berechtigung'),
    });
  }

  private handleSyncComplete(info: any): void {
    logger.info('Sync abgeschlossen', info);
    this.updateState({
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
    });
  }

  private handleSyncError(err: any): void {
    logger.error('Sync-Fehler', { error: err });
    this.updateState({
      status: 'error',
      error: err.message || 'Synchronisationsfehler',
    });
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    this.updateState({ isOnline });

    if (isOnline && this.settings.enabled && this.remoteDB) {
      // Sync neu starten, wenn wieder online
      this.startSync();
    } else if (!isOnline) {
      this.updateState({ status: 'paused' });
    }
  }

  // ==========================================================================
  // Dokumenten-Operationen
  // ==========================================================================

  /**
   * Speichert ein Dokument
   */
  async saveDocument<T extends SyncDocument>(doc: T): Promise<T> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    try {
      // Bestehende Revision abrufen, falls vorhanden
      let existingRev: string | undefined;
      try {
        const existing = await this.localDB.get(doc._id);
        existingRev = existing._rev;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const docToSave = {
        ...doc,
        _rev: existingRev,
        updatedAt: new Date().toISOString(),
      };

      const result = await this.localDB.put(docToSave);

      return {
        ...docToSave,
        _rev: result.rev,
      } as T;
    } catch (error) {
      logger.error('Fehler beim Speichern des Dokuments', { docId: doc._id, error });
      throw error;
    }
  }

  /**
   * Lädt ein Dokument
   */
  async getDocument<T extends SyncDocument>(id: string): Promise<T | null> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    try {
      const doc = await this.localDB.get(id, { conflicts: true });
      return doc as unknown as T;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Löscht ein Dokument (Soft-Delete)
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    try {
      const doc = await this.localDB.get(id);
      await this.localDB.remove(doc);
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
    }
  }

  // ==========================================================================
  // Notiz-Operationen
  // ==========================================================================

  /**
   * Speichert eine Notiz
   */
  async saveNote(note: Omit<NoteDocument, '_rev'>): Promise<NoteDocument> {
    const doc: NoteDocument = {
      ...note,
      type: 'note',
      updatedAt: new Date().toISOString(),
    };
    return this.saveDocument(doc);
  }

  /**
   * Lädt eine Notiz
   */
  async getNote(id: string): Promise<NoteDocument | null> {
    return this.getDocument<NoteDocument>(id);
  }

  /**
   * Lädt alle Notizen eines Ordners
   */
  async getNotesByFolder(folderId: string | null): Promise<NoteDocument[]> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    const result = await this.localDB.find({
      selector: {
        type: 'note',
        parentId: folderId,
      },
    });

    return result.docs as unknown as NoteDocument[];
  }

  /**
   * Lädt alle Notizen
   */
  async getAllNotes(): Promise<NoteDocument[]> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    const result = await this.localDB.find({
      selector: {
        type: 'note',
      },
    });

    return result.docs as unknown as NoteDocument[];
  }

  // ==========================================================================
  // Ordner-Operationen
  // ==========================================================================

  /**
   * Speichert einen Ordner
   */
  async saveFolder(folder: Omit<FolderDocument, '_rev'>): Promise<FolderDocument> {
    const doc: FolderDocument = {
      ...folder,
      type: 'folder',
      updatedAt: new Date().toISOString(),
    };
    return this.saveDocument(doc);
  }

  /**
   * Lädt einen Ordner
   */
  async getFolder(id: string): Promise<FolderDocument | null> {
    return this.getDocument<FolderDocument>(id);
  }

  /**
   * Lädt alle Ordner eines Parent-Ordners
   */
  async getFoldersByParent(parentId: string | null): Promise<FolderDocument[]> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    const result = await this.localDB.find({
      selector: {
        type: 'folder',
        parentId: parentId,
      },
    });

    return result.docs as unknown as FolderDocument[];
  }

  /**
   * Lädt alle Ordner
   */
  async getAllFolders(): Promise<FolderDocument[]> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    const result = await this.localDB.find({
      selector: {
        type: 'folder',
      },
    });

    return result.docs as unknown as FolderDocument[];
  }

  // ==========================================================================
  // Hierarchie-Operationen
  // ==========================================================================

  /**
   * Lädt die gesamte Ordnerstruktur als Baum
   */
  async getNotebookTree(): Promise<(FolderDocument | NoteDocument)[]> {
    const [folders, notes] = await Promise.all([
      this.getAllFolders(),
      this.getAllNotes(),
    ]);

    // Baum aufbauen
    const buildTree = (
      parentId: string | null
    ): (FolderDocument | NoteDocument)[] => {
      const items: (FolderDocument | NoteDocument)[] = [];

      // Ordner hinzufügen
      folders
        .filter((f) => f.parentId === parentId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name))
        .forEach((folder) => {
          items.push(folder);
        });

      // Notizen hinzufügen
      notes
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((note) => {
          items.push(note);
        });

      return items;
    };

    return buildTree(null);
  }

  /**
   * Verschiebt ein Element in einen anderen Ordner
   */
  async moveItem(
    itemId: string,
    newParentId: string | null
  ): Promise<void> {
    const doc = await this.getDocument<FolderDocument | NoteDocument>(itemId);
    if (!doc) {
      throw new Error('Element nicht gefunden');
    }

    await this.saveDocument({
      ...doc,
      parentId: newParentId,
    });
  }

  // ==========================================================================
  // Konflikt-Behandlung
  // ==========================================================================

  /**
   * Prüft Dokumente auf Konflikte
   */
  private async checkForConflicts(docs: SyncDocument[]): Promise<void> {
    for (const doc of docs) {
      if (doc._conflicts && doc._conflicts.length > 0) {
        const conflictInfo = await this.buildConflictInfo(doc);
        if (conflictInfo) {
          this.emitConflict(conflictInfo);
        }
      }
    }
  }

  /**
   * Erstellt Konflikt-Informationen
   */
  private async buildConflictInfo(
    doc: SyncDocument
  ): Promise<ConflictInfo | null> {
    if (!this.localDB || !doc._conflicts || doc._conflicts.length === 0) {
      return null;
    }

    try {
      // Hole die erste Konflikt-Revision
      const conflictDoc = await this.localDB.get(doc._id, {
        rev: doc._conflicts[0],
      });

      return {
        documentId: doc._id,
        documentType: doc.type,
        localVersion: doc,
        remoteVersion: conflictDoc as unknown as SyncDocument,
        conflictRevisions: doc._conflicts,
      };
    } catch (error) {
      logger.error('Fehler beim Laden der Konflikt-Version', { error });
      return null;
    }
  }

  /**
   * Löst einen Konflikt auf
   */
  async resolveConflict(
    docId: string,
    winningRev: string,
    losingRevs: string[]
  ): Promise<void> {
    if (!this.localDB) {
      throw new Error('Datenbank nicht initialisiert');
    }

    // Verlierende Revisionen löschen
    for (const rev of losingRevs) {
      try {
        await this.localDB.remove(docId, rev);
      } catch (error) {
        logger.warn('Fehler beim Löschen der Konflikt-Revision', {
          docId,
          rev,
          error,
        });
      }
    }

    logger.info('Konflikt aufgelöst', { docId, winningRev });
  }

  // ==========================================================================
  // Event-System
  // ==========================================================================

  /**
   * Registriert einen State-Change-Listener
   */
  onStateChange(callback: SyncEventCallback): () => void {
    this.events.onStateChange.push(callback);
    // Sofort aktuellen State senden
    callback(this.state);
    // Unsubscribe-Funktion zurückgeben
    return () => {
      const index = this.events.onStateChange.indexOf(callback);
      if (index > -1) {
        this.events.onStateChange.splice(index, 1);
      }
    };
  }

  /**
   * Registriert einen Change-Listener
   */
  onChange(callback: ChangeEventCallback): () => void {
    this.events.onChange.push(callback);
    return () => {
      const index = this.events.onChange.indexOf(callback);
      if (index > -1) {
        this.events.onChange.splice(index, 1);
      }
    };
  }

  /**
   * Registriert einen Konflikt-Listener
   */
  onConflict(callback: ConflictEventCallback): () => void {
    this.events.onConflict.push(callback);
    return () => {
      const index = this.events.onConflict.indexOf(callback);
      if (index > -1) {
        this.events.onConflict.splice(index, 1);
      }
    };
  }

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.events.onStateChange.forEach((cb) => cb(this.state));
  }

  private emitChange(docs: SyncDocument[]): void {
    this.events.onChange.forEach((cb) => cb(docs));
  }

  private emitConflict(conflict: ConflictInfo): void {
    this.events.onConflict.forEach((cb) => cb(conflict));
  }

  // ==========================================================================
  // Einstellungen
  // ==========================================================================

  private loadSettings(): SyncSettings {
    try {
      const stored = localStorage.getItem('excalinote_sync_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('Fehler beim Laden der Sync-Einstellungen', { error });
    }

    return {
      enabled: false,
      server: null,
      autoSync: true,
      syncInterval: 30000,
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(
        'excalinote_sync_settings',
        JSON.stringify(this.settings)
      );
    } catch (error) {
      logger.warn('Fehler beim Speichern der Sync-Einstellungen', { error });
    }
  }

  /**
   * Gibt die aktuellen Einstellungen zurück
   */
  getSettings(): SyncSettings {
    return { ...this.settings };
  }

  /**
   * Gibt den aktuellen Status zurück
   */
  getState(): SyncState {
    return { ...this.state };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Beendet den Service und gibt Ressourcen frei
   */
  async destroy(): Promise<void> {
    this.stopSync();

    if (this.remoteDB) {
      await this.remoteDB.close();
      this.remoteDB = null;
    }

    if (this.localDB) {
      await this.localDB.close();
      this.localDB = null;
    }

    this.events.onStateChange = [];
    this.events.onChange = [];
    this.events.onConflict = [];
    this.isInitialized = false;

    logger.info('SyncService beendet');
  }
}

// Singleton-Instanz exportieren
export const syncService = new SyncService();

// Für Tests: Klasse auch exportieren
export { SyncService };
