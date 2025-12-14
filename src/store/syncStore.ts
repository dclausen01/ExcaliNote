/**
 * Sync Store - Zustand-Integration für SyncService
 *
 * Verwaltet den Sync-Status und stellt Aktionen für die
 * Synchronisation bereit.
 */

import { create } from 'zustand';
import { syncService } from '../services/syncService';
import { migrationService } from '../services/migrationService';
import type {
  SyncState,
  SyncServerConfig,
  SyncSettings,
  ConflictInfo,
  MigrationProgress,
  NoteDocument,
  FolderDocument,
} from '../types/sync';
import { logger } from '../utils/logger';

// ============================================================================
// Store-Typen
// ============================================================================

interface SyncStore {
  // Status
  syncState: SyncState;
  isInitialized: boolean;
  conflicts: ConflictInfo[];
  migrationProgress: MigrationProgress | null;

  // Einstellungen
  settings: SyncSettings;

  // Modals/Dialoge
  showSyncDialog: boolean;
  showMigrationDialog: boolean;
  showConflictDialog: boolean;

  // Aktionen
  initialize: () => Promise<void>;
  connect: (config: SyncServerConfig) => Promise<void>;
  disconnect: () => void;
  forceSync: () => Promise<void>;

  // Migration
  startMigration: () => Promise<void>;
  checkMigrationNeeded: () => Promise<boolean>;

  // Konflikte
  resolveConflict: (
    docId: string,
    resolution: 'local' | 'remote'
  ) => Promise<void>;
  dismissConflict: (docId: string) => void;

  // UI-Steuerung
  setShowSyncDialog: (show: boolean) => void;
  setShowMigrationDialog: (show: boolean) => void;
  setShowConflictDialog: (show: boolean) => void;

  // Cleanup
  cleanup: () => Promise<void>;
}

// ============================================================================
// Store erstellen
// ============================================================================

export const useSyncStore = create<SyncStore>((set, get) => ({
  // Initialer Status
  syncState: {
    status: 'disconnected',
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null,
    isOnline: true,
  },
  isInitialized: false,
  conflicts: [],
  migrationProgress: null,
  settings: syncService.getSettings(),

  // UI-Status
  showSyncDialog: false,
  showMigrationDialog: false,
  showConflictDialog: false,

  // ==========================================================================
  // Initialisierung
  // ==========================================================================

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      // SyncService initialisieren
      await syncService.initialize();

      // Event-Listener registrieren
      syncService.onStateChange((state) => {
        set({ syncState: state });
      });

      syncService.onConflict((conflict) => {
        set((prev) => ({
          conflicts: [...prev.conflicts, conflict],
          showConflictDialog: true,
        }));
      });

      set({
        isInitialized: true,
        settings: syncService.getSettings(),
      });

      logger.info('SyncStore initialisiert');
    } catch (error) {
      logger.error('Fehler bei SyncStore-Initialisierung', { error });
      throw error;
    }
  },

  // ==========================================================================
  // Verbindung
  // ==========================================================================

  connect: async (config: SyncServerConfig) => {
    try {
      await syncService.connect(config);
      set({ settings: syncService.getSettings() });
    } catch (error) {
      logger.error('Verbindungsfehler', { error });
      throw error;
    }
  },

  disconnect: () => {
    syncService.disconnect();
    set({ settings: syncService.getSettings() });
  },

  forceSync: async () => {
    try {
      await syncService.forceSync();
    } catch (error) {
      logger.error('Sync-Fehler', { error });
      throw error;
    }
  },

  // ==========================================================================
  // Migration
  // ==========================================================================

  startMigration: async () => {
    set({ showMigrationDialog: true });

    // Progress-Callback registrieren
    const unsubscribe = migrationService.onProgress((progress) => {
      set({ migrationProgress: progress });
    });

    try {
      await migrationService.migrateAll();
    } finally {
      unsubscribe();
    }
  },

  checkMigrationNeeded: async () => {
    const status = await migrationService.checkMigrationStatus();
    return status.localFileCount > 0 && !status.hasMigrated;
  },

  // ==========================================================================
  // Konflikt-Behandlung
  // ==========================================================================

  resolveConflict: async (docId: string, resolution: 'local' | 'remote') => {
    const conflict = get().conflicts.find((c) => c.documentId === docId);
    if (!conflict) return;

    try {
      const winningRev =
        resolution === 'local'
          ? conflict.localVersion._rev!
          : conflict.conflictRevisions[0];

      const losingRevs =
        resolution === 'local'
          ? conflict.conflictRevisions
          : [conflict.localVersion._rev!];

      await syncService.resolveConflict(docId, winningRev, losingRevs);

      // Konflikt aus Liste entfernen
      set((prev) => ({
        conflicts: prev.conflicts.filter((c) => c.documentId !== docId),
        showConflictDialog: prev.conflicts.length > 1,
      }));
    } catch (error) {
      logger.error('Fehler bei Konflikt-Auflösung', { error });
      throw error;
    }
  },

  dismissConflict: (docId: string) => {
    set((prev) => ({
      conflicts: prev.conflicts.filter((c) => c.documentId !== docId),
      showConflictDialog: prev.conflicts.length > 1,
    }));
  },

  // ==========================================================================
  // UI-Steuerung
  // ==========================================================================

  setShowSyncDialog: (show: boolean) => set({ showSyncDialog: show }),
  setShowMigrationDialog: (show: boolean) => set({ showMigrationDialog: show }),
  setShowConflictDialog: (show: boolean) => set({ showConflictDialog: show }),

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  cleanup: async () => {
    await syncService.destroy();
    set({ isInitialized: false });
  },
}));

// ============================================================================
// Selektoren für Performance-Optimierung
// ============================================================================

export const selectSyncStatus = (state: SyncStore) => state.syncState.status;
export const selectIsOnline = (state: SyncStore) => state.syncState.isOnline;
export const selectHasConflicts = (state: SyncStore) => state.conflicts.length > 0;
export const selectIsSyncing = (state: SyncStore) =>
  state.syncState.status === 'syncing';
export const selectIsConnected = (state: SyncStore) =>
  state.syncState.status !== 'disconnected' &&
  state.syncState.status !== 'error';
