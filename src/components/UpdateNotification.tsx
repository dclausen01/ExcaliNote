import { useEffect, useState } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import type { UpdateInfo } from '../../electron/preload';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electron?.updates) return;

    // Event-Listener für Update verfügbar
    const unsubscribeAvailable = window.electron.updates.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setIsDownloading(false);
      setIsDownloaded(false);
      setError(null);
    });

    // Event-Listener für Download-Fortschritt
    const unsubscribeProgress = window.electron.updates.onDownloadProgress((progress) => {
      setDownloadProgress(progress.percent);
    });

    // Event-Listener für Update heruntergeladen
    const unsubscribeDownloaded = window.electron.updates.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setIsDownloading(false);
      setIsDownloaded(true);
      setDownloadProgress(100);
    });

    // Event-Listener für Fehler
    const unsubscribeError = window.electron.updates.onUpdateError((errorMsg) => {
      setError(errorMsg);
      setIsDownloading(false);
    });

    // Cleanup
    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, []);

  const handleDownload = async () => {
    if (!window.electron?.updates) return;
    
    try {
      setIsDownloading(true);
      setError(null);
      await window.electron.updates.installUpdate();
    } catch (err) {
      setError('Fehler beim Herunterladen des Updates');
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    if (!window.electron?.updates) return;
    
    // Der AutoUpdater wird die App automatisch neu starten
    // Das Update wird beim nächsten Start installiert
    window.close();
  };

  const handleDismiss = () => {
    setUpdateInfo(null);
    setIsDownloaded(false);
    setDownloadProgress(0);
    setError(null);
  };

  const handleCheckForUpdates = async () => {
    if (!window.electron?.updates) return;
    
    try {
      await window.electron.updates.checkForUpdates();
    } catch (err) {
      console.error('Fehler beim Suchen nach Updates:', err);
    }
  };

  // Zeige nichts an, wenn kein Update verfügbar ist
  if (!updateInfo && !error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="text-blue-500" size={24} />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {isDownloaded ? 'Update bereit!' : 'Update verfügbar'}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        {updateInfo && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Version {updateInfo.version} ist verfügbar
            </p>
            {updateInfo.releaseNotes && (
              <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                {updateInfo.releaseNotes}
              </p>
            )}
          </div>
        )}

        {isDownloading && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Wird heruntergeladen...</span>
              <span>{downloadProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isDownloaded && !isDownloading && (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                Jetzt herunterladen
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Später
              </button>
            </>
          )}

          {isDownloaded && (
            <>
              <button
                onClick={handleInstall}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Neu starten & installieren
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Später
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
