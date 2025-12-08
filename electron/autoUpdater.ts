import { BrowserWindow } from 'electron';

// Lazy-load electron-updater nur in Production
let autoUpdater: any = null;

function getAutoUpdater() {
  if (!autoUpdater && process.env.NODE_ENV !== 'development') {
    autoUpdater = require('electron-updater').autoUpdater;
    
    // Konfiguriere den AutoUpdater
    autoUpdater.autoDownload = false; // Wir wollen manuell downloaden
    autoUpdater.autoInstallOnAppQuit = true; // Automatisch beim Beenden installieren
    
    // Explizit GitHub-Provider setzen
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'dclausen01',
      repo: 'ExcaliNote',
    });
    
    console.log('[AutoUpdater] GitHub Feed konfiguriert:', {
      owner: 'dclausen01',
      repo: 'ExcaliNote',
    });
  }
  return autoUpdater;
}

let mainWindow: BrowserWindow | null = null;

export function initAutoUpdater(window: BrowserWindow) {
  const updater = getAutoUpdater();
  if (!updater) {
    console.log('[AutoUpdater] Übersprungen (Development-Mode)');
    return;
  }
  
  mainWindow = window;
  
  // Logging für Debugging
  updater.logger = {
    info: (msg: any) => console.log('[AutoUpdater]', msg),
    warn: (msg: any) => console.warn('[AutoUpdater]', msg),
    error: (msg: any) => console.error('[AutoUpdater]', msg),
    debug: (msg: any) => console.debug('[AutoUpdater]', msg),
  };

  // Event: Update wird gesucht
  updater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Suche nach Updates...');
  });

  // Event: Update verfügbar
  updater.on('update-available', (info: any) => {
    console.log('[AutoUpdater] Update verfügbar:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  // Event: Kein Update verfügbar
  updater.on('update-not-available', (info: any) => {
    console.log('[AutoUpdater] Keine Updates verfügbar. Aktuelle Version:', info.version);
  });

  // Event: Download-Fortschritt
  updater.on('download-progress', (progressObj: any) => {
    console.log(`[AutoUpdater] Download-Fortschritt: ${progressObj.percent.toFixed(2)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', {
        percent: progressObj.percent,
      });
    }
  });

  // Event: Update heruntergeladen
  updater.on('update-downloaded', (info: any) => {
    console.log('[AutoUpdater] Update heruntergeladen:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  // Event: Fehler
  updater.on('error', (error: any) => {
    console.error('[AutoUpdater] Fehler:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
  });

  // Initiale Update-Überprüfung (nach 10 Sekunden)
  setTimeout(() => {
    checkForUpdates();
  }, 10000);

  // Regelmäßige Update-Überprüfung (alle 12 Stunden)
  setInterval(() => {
    checkForUpdates();
  }, 12 * 60 * 60 * 1000);
}

export async function checkForUpdates() {
  try {
    const updater = getAutoUpdater();
    if (!updater) {
      console.log('[AutoUpdater] Development-Mode: Update-Suche übersprungen');
      return null;
    }

    console.log('[AutoUpdater] Suche nach Updates...');
    const result = await updater.checkForUpdates();
    return result;
  } catch (error) {
    console.error('[AutoUpdater] Fehler beim Suchen nach Updates:', error);
    return null;
  }
}

export async function downloadUpdate() {
  try {
    const updater = getAutoUpdater();
    if (!updater) {
      throw new Error('AutoUpdater nicht verfügbar');
    }
    
    console.log('[AutoUpdater] Starte Download...');
    await updater.downloadUpdate();
  } catch (error) {
    console.error('[AutoUpdater] Fehler beim Herunterladen des Updates:', error);
    throw error;
  }
}

export function quitAndInstall() {
  const updater = getAutoUpdater();
  if (!updater) {
    console.error('[AutoUpdater] Nicht verfügbar');
    return;
  }
  
  console.log('[AutoUpdater] Installiere Update und starte neu...');
  updater.quitAndInstall(false, true);
}
