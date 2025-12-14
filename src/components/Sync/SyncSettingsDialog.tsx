/**
 * SyncSettingsDialog - Dialog für Sync-Einstellungen
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  User,
  Lock,
  RefreshCw,
  Check,
  AlertCircle,
  Cloud,
  CloudOff,
  Database,
  Upload,
} from 'lucide-react';
import { useSyncStore } from '../../store/syncStore';
import type { SyncServerConfig } from '../../types/sync';

interface SyncSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncSettingsDialog: React.FC<SyncSettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    syncState,
    settings,
    connect,
    disconnect,
    forceSync,
    startMigration,
    checkMigrationNeeded,
  } = useSyncStore();

  // Formular-State
  const [serverUrl, setServerUrl] = useState(settings.server?.serverUrl || '');
  const [username, setUsername] = useState(settings.server?.username || '');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMigrationOption, setShowMigrationOption] = useState(false);

  // Migration-Check beim Öffnen
  useEffect(() => {
    if (isOpen) {
      checkMigrationNeeded().then(setShowMigrationOption);
    }
  }, [isOpen, checkMigrationNeeded]);

  // Einstellungen laden
  useEffect(() => {
    if (settings.server) {
      setServerUrl(settings.server.serverUrl);
      setUsername(settings.server.username);
    }
  }, [settings.server]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    try {
      const config: SyncServerConfig = {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password: password,
      };

      await connect(config);
      setPassword(''); // Passwort aus Sicherheitsgründen löschen
    } catch (err: any) {
      setError(err.message || 'Verbindung fehlgeschlagen');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setPassword('');
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMigration = async () => {
    try {
      await startMigration();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isConnected =
    syncState.status !== 'disconnected' && syncState.status !== 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Cloud size={20} />
            Synchronisation
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status-Anzeige */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Check className="text-green-500" size={18} />
                ) : (
                  <CloudOff className="text-gray-400" size={18} />
                )}
                <span className="font-medium">
                  {isConnected ? 'Verbunden' : 'Nicht verbunden'}
                </span>
              </div>
              {syncState.lastSyncedAt && (
                <span className="text-sm text-gray-500">
                  Zuletzt: {new Date(syncState.lastSyncedAt).toLocaleString('de-DE')}
                </span>
              )}
            </div>
            {syncState.error && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {syncState.error}
              </p>
            )}
          </div>

          {/* Verbindungsformular */}
          {!isConnected ? (
            <form onSubmit={handleConnect} className="space-y-3">
              {/* Server-URL */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Server-URL
                </label>
                <div className="relative">
                  <Server
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="url"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://sync.example.com"
                    className="w-full pl-10 pr-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Die URL deines CouchDB-Servers
                </p>
              </div>

              {/* Benutzername */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Benutzername
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="benutzername"
                    className="w-full pl-10 pr-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Passwort
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
              </div>

              {/* Fehleranzeige */}
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {error}
                </p>
              )}

              {/* Verbinden-Button */}
              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Verbinde...
                  </>
                ) : (
                  <>
                    <Cloud size={16} />
                    Verbinden
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Verbundene Ansicht */
            <div className="space-y-3">
              {/* Server-Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Server size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {settings.server?.serverUrl}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <User size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {settings.server?.username}
                  </span>
                </div>
              </div>

              {/* Aktionen */}
              <div className="flex gap-2">
                <button
                  onClick={handleForceSync}
                  disabled={syncState.status === 'syncing'}
                  className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw
                    size={16}
                    className={syncState.status === 'syncing' ? 'animate-spin' : ''}
                  />
                  Jetzt synchronisieren
                </button>
                <button
                  onClick={handleDisconnect}
                  className="py-2 px-4 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40"
                >
                  Trennen
                </button>
              </div>
            </div>
          )}

          {/* Migration-Option */}
          {showMigrationOption && (
            <div className="mt-4 p-3 border border-dashed rounded-lg dark:border-gray-600">
              <div className="flex items-start gap-3">
                <Database size={20} className="text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">Lokale Dateien migrieren</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Bestehende Notizen in die Sync-Datenbank importieren.
                  </p>
                  <button
                    onClick={handleMigration}
                    className="mt-2 text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Upload size={14} />
                    Migration starten
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Server-Hinweis */}
          <div className="text-xs text-gray-500 pt-2 border-t dark:border-gray-700">
            <p>
              Du benötigst einen CouchDB-Server für die Synchronisation.{' '}
              <a
                href="https://docs.excalinote.app/sync"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anleitung zur Einrichtung
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncSettingsDialog;
