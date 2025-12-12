/**
 * MigrationService - Migration lokaler Dateien zu PouchDB
 *
 * Migriert bestehende .excalidraw Dateien aus dem lokalen
 * Dateisystem in die PouchDB-Datenbank.
 */

import type {
  NoteDocument,
  FolderDocument,
  ExcalidrawContent,
  MigrationProgress,
} from '../types/sync';
import { generateDocId } from '../types/sync';
import { syncService } from './syncService';
import { logger } from '../utils/logger';

// ============================================================================
// Typen
// ============================================================================

interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

type MigrationProgressCallback = (progress: MigrationProgress) => void;

// ============================================================================
// MigrationService Klasse
// ============================================================================

class MigrationService {
  private userId: string = 'local';
  private pathToIdMap: Map<string, string> = new Map();
  private progressCallback: MigrationProgressCallback | null = null;
  private progress: MigrationProgress = {
    total: 0,
    current: 0,
    currentItem: '',
    status: 'pending',
  };

  /**
   * Setzt den aktuellen Benutzer für die Migration
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Registriert einen Progress-Callback
   */
  onProgress(callback: MigrationProgressCallback): () => void {
    this.progressCallback = callback;
    return () => {
      this.progressCallback = null;
    };
  }

  /**
   * Startet die Migration aller lokalen Dateien
   */
  async migrateAll(): Promise<{ folders: number; notes: number }> {
    this.progress = {
      total: 0,
      current: 0,
      currentItem: 'Zähle Dateien...',
      status: 'in_progress',
    };
    this.updateProgress();

    try {
      // Sicherstellen, dass SyncService initialisiert ist
      await syncService.initialize();

      // Zuerst zählen
      const itemCount = await this.countItems('');
      this.progress.total = itemCount;
      this.updateProgress();

      // Dann migrieren
      const result = await this.migrateFolder('', null);

      this.progress.status = 'completed';
      this.progress.currentItem = 'Migration abgeschlossen';
      this.updateProgress();

      logger.info('Migration abgeschlossen', result);
      return result;
    } catch (error: any) {
      this.progress.status = 'error';
      this.progress.error = error.message;
      this.updateProgress();

      logger.error('Migration fehlgeschlagen', { error });
      throw error;
    }
  }

  /**
   * Zählt alle zu migrierenden Elemente
   */
  private async countItems(path: string): Promise<number> {
    let count = 0;

    try {
      const entries = await window.electron.fs.readDir(path) as FileSystemEntry[];

      for (const entry of entries) {
        if (entry.isDirectory) {
          count += 1; // Ordner
          count += await this.countItems(entry.path); // Rekursiv
        } else if (entry.name.endsWith('.excalidraw')) {
          count += 1; // Notiz
        }
      }
    } catch (error) {
      logger.warn('Fehler beim Zählen', { path, error });
    }

    return count;
  }

  /**
   * Migriert einen Ordner und alle Unterelemente
   */
  private async migrateFolder(
    path: string,
    parentId: string | null
  ): Promise<{ folders: number; notes: number }> {
    let folderCount = 0;
    let noteCount = 0;

    try {
      const entries = await window.electron.fs.readDir(path) as FileSystemEntry[];

      // Sortieren: Ordner zuerst
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of entries) {
        if (entry.isDirectory) {
          // Ordner migrieren
          const folderId = await this.migrateSingleFolder(entry, parentId);
          folderCount += 1;

          // Rekursiv Unterordner migrieren
          const subResult = await this.migrateFolder(entry.path, folderId);
          folderCount += subResult.folders;
          noteCount += subResult.notes;
        } else if (entry.name.endsWith('.excalidraw')) {
          // Notiz migrieren
          await this.migrateSingleNote(entry, parentId);
          noteCount += 1;
        }
      }
    } catch (error) {
      logger.error('Fehler beim Migrieren des Ordners', { path, error });
    }

    return { folders: folderCount, notes: noteCount };
  }

  /**
   * Migriert einen einzelnen Ordner
   */
  private async migrateSingleFolder(
    entry: FileSystemEntry,
    parentId: string | null
  ): Promise<string> {
    this.progress.current += 1;
    this.progress.currentItem = `Ordner: ${entry.name}`;
    this.updateProgress();

    const folderId = generateDocId('folder');

    // Pfad-zu-ID-Mapping speichern
    this.pathToIdMap.set(entry.path, folderId);

    const folder: Omit<FolderDocument, '_rev'> = {
      _id: folderId,
      type: 'folder',
      name: entry.name,
      parentId: parentId,
      folderType: 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.userId,
      modifiedBy: this.userId,
    };

    await syncService.saveFolder(folder);
    logger.debug('Ordner migriert', { name: entry.name, id: folderId });

    return folderId;
  }

  /**
   * Migriert eine einzelne Notiz
   */
  private async migrateSingleNote(
    entry: FileSystemEntry,
    parentId: string | null
  ): Promise<string> {
    this.progress.current += 1;
    this.progress.currentItem = `Notiz: ${entry.name}`;
    this.updateProgress();

    const noteId = generateDocId('note');

    // Pfad-zu-ID-Mapping speichern
    this.pathToIdMap.set(entry.path, noteId);

    try {
      // Dateiinhalt laden
      const content = await window.electron.fs.readFile(entry.path);
      const excalidrawContent = JSON.parse(content) as ExcalidrawContent;

      // Dateiname ohne Erweiterung
      const name = entry.name.replace(/\.excalidraw$/, '');

      const note: Omit<NoteDocument, '_rev'> = {
        _id: noteId,
        type: 'note',
        name: name,
        parentId: parentId,
        content: excalidrawContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: this.userId,
        modifiedBy: this.userId,
      };

      await syncService.saveNote(note);
      logger.debug('Notiz migriert', { name: entry.name, id: noteId });
    } catch (error) {
      logger.error('Fehler beim Migrieren der Notiz', { path: entry.path, error });
      throw error;
    }

    return noteId;
  }

  /**
   * Gibt das Pfad-zu-ID-Mapping zurück
   */
  getPathToIdMap(): Map<string, string> {
    return new Map(this.pathToIdMap);
  }

  /**
   * Prüft, ob bereits migriert wurde
   */
  async checkMigrationStatus(): Promise<{
    hasMigrated: boolean;
    localFileCount: number;
    dbDocumentCount: number;
  }> {
    try {
      // Lokale Dateien zählen
      const localCount = await this.countItems('');

      // Datenbank-Dokumente zählen
      await syncService.initialize();
      const notes = await syncService.getAllNotes();
      const folders = await syncService.getAllFolders();
      const dbCount = notes.length + folders.length;

      return {
        hasMigrated: dbCount > 0,
        localFileCount: localCount,
        dbDocumentCount: dbCount,
      };
    } catch (error) {
      logger.error('Fehler beim Prüfen des Migration-Status', { error });
      return {
        hasMigrated: false,
        localFileCount: 0,
        dbDocumentCount: 0,
      };
    }
  }

  /**
   * Exportiert alle Datenbank-Dokumente zurück ins Dateisystem
   */
  async exportToFiles(targetPath: string): Promise<{ folders: number; notes: number }> {
    let folderCount = 0;
    let noteCount = 0;

    try {
      await syncService.initialize();

      const folders = await syncService.getAllFolders();
      const notes = await syncService.getAllNotes();

      // ID-zu-Pfad-Mapping aufbauen
      const idToPath = new Map<string, string>();
      idToPath.set('', targetPath); // Root

      // Ordner nach Hierarchie sortieren und erstellen
      const sortedFolders = this.sortFoldersByHierarchy(folders);

      for (const folder of sortedFolders) {
        const parentPath = folder.parentId
          ? idToPath.get(folder.parentId) || targetPath
          : targetPath;
        const folderPath = `${parentPath}/${folder.name}`;

        await window.electron.fs.createDir(folderPath);
        idToPath.set(folder._id, folderPath);
        folderCount += 1;
      }

      // Notizen exportieren
      for (const note of notes) {
        const parentPath = note.parentId
          ? idToPath.get(note.parentId) || targetPath
          : targetPath;
        const notePath = `${parentPath}/${note.name}.excalidraw`;

        await window.electron.fs.writeFile(
          notePath,
          JSON.stringify(note.content, null, 2)
        );
        noteCount += 1;
      }

      logger.info('Export abgeschlossen', { folders: folderCount, notes: noteCount });
      return { folders: folderCount, notes: noteCount };
    } catch (error) {
      logger.error('Export fehlgeschlagen', { error });
      throw error;
    }
  }

  /**
   * Sortiert Ordner nach Hierarchie (Parents vor Children)
   */
  private sortFoldersByHierarchy(folders: FolderDocument[]): FolderDocument[] {
    const sorted: FolderDocument[] = [];
    const remaining = [...folders];
    const addedIds = new Set<string>();

    // Root-Ordner zuerst
    const rootFolders = remaining.filter((f) => f.parentId === null);
    sorted.push(...rootFolders);
    rootFolders.forEach((f) => addedIds.add(f._id));

    // Iterativ Children hinzufügen
    let iterations = 0;
    while (sorted.length < folders.length && iterations < 100) {
      const newlyAdded: FolderDocument[] = [];

      for (const folder of remaining) {
        if (!addedIds.has(folder._id) && folder.parentId && addedIds.has(folder.parentId)) {
          newlyAdded.push(folder);
          addedIds.add(folder._id);
        }
      }

      sorted.push(...newlyAdded);
      iterations += 1;
    }

    return sorted;
  }

  /**
   * Aktualisiert den Progress-Callback
   */
  private updateProgress(): void {
    if (this.progressCallback) {
      this.progressCallback({ ...this.progress });
    }
  }
}

// Singleton-Instanz exportieren
export const migrationService = new MigrationService();

// Für Tests: Klasse auch exportieren
export { MigrationService };
