import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { homedir } from 'os';
import { initAutoUpdater, checkForUpdates, downloadUpdate, quitAndInstall } from './autoUpdater';

const EXCALINOTE_DIR = path.join(homedir(), 'ExcaliNote');

// Erstelle das ExcaliNote-Verzeichnis beim Start
async function ensureExcalinoteDir() {
  try {
    await fs.mkdir(EXCALINOTE_DIR, { recursive: true });
    console.log('ExcaliNote-Verzeichnis erstellt:', EXCALINOTE_DIR);
  } catch (error) {
    console.error('Fehler beim Erstellen des ExcaliNote-Verzeichnisses:', error);
  }
}

/**
 * Validates and resolves a relative path to ensure it stays within the base directory.
 * Prevents path traversal attacks.
 * 
 * @param relativePath - The relative path to validate
 * @returns The resolved absolute path
 * @throws {Error} If path traversal is detected or path is invalid
 */
function validateAndResolvePath(relativePath: string): string {
  // Normalisiere den Pfad
  const normalized = path.normalize(relativePath);
  
  // Verhindere absolute Pfade und parent directory traversal
  if (path.isAbsolute(normalized) || normalized.startsWith('..')) {
    throw new Error('Invalid path: Path traversal detected');
  }
  
  // Erstelle den vollständigen Pfad
  const fullPath = path.join(EXCALINOTE_DIR, normalized);
  
  // Stelle sicher, dass der resolved path innerhalb EXCALINOTE_DIR liegt
  const resolvedPath = path.resolve(fullPath);
  const resolvedBaseDir = path.resolve(EXCALINOTE_DIR);
  
  if (!resolvedPath.startsWith(resolvedBaseDir)) {
    throw new Error('Invalid path: Outside of base directory');
  }
  
  return resolvedPath;
}

let mainWindow: typeof BrowserWindow.prototype | null = null;

function createWindow() {
  // Menü-Leiste entfernen
  Menu.setApplicationMenu(null);

  // Icon-Pfad korrekt für dev und production
  const iconPath = process.env.VITE_DEV_SERVER_URL 
    ? path.join(__dirname, '../assets/excalinotes_icon.png')
    : path.join(process.resourcesPath, 'app.asar', 'assets', 'excalinotes_icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: iconPath
  });

  // In development mode, load from vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureExcalinoteDir();
  createWindow();
  
  // AutoUpdater initialisieren (nur in Production)
  if (mainWindow && !process.env.VITE_DEV_SERVER_URL) {
    initAutoUpdater(mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers für Dateisystem-Operationen

// Verzeichnisstruktur lesen
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    const fullPath = validateAndResolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }));
  } catch (error) {
    console.error('Fehler beim Lesen des Verzeichnisses:', error);
    throw error;
  }
});

// Datei lesen
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const fullPath = validateAndResolvePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Fehler beim Lesen der Datei:', error);
    throw error;
  }
});

// Datei schreiben
ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  try {
    const fullPath = validateAndResolvePath(filePath);
    const dir = path.dirname(fullPath);
    
    // Stelle sicher, dass das Verzeichnis existiert
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Schreiben der Datei:', error);
    throw error;
  }
});

// Verzeichnis erstellen
ipcMain.handle('fs:createDir', async (_, dirPath: string) => {
  try {
    const fullPath = validateAndResolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Erstellen des Verzeichnisses:', error);
    throw error;
  }
});

// Datei oder Verzeichnis löschen
ipcMain.handle('fs:delete', async (_, itemPath: string) => {
  try {
    const fullPath = validateAndResolvePath(itemPath);
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    throw error;
  }
});

// Umbenennen/Verschieben
ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
  try {
    const fullOldPath = validateAndResolvePath(oldPath);
    const fullNewPath = validateAndResolvePath(newPath);
    
    // Stelle sicher, dass das Zielverzeichnis existiert
    const newDir = path.dirname(fullNewPath);
    await fs.mkdir(newDir, { recursive: true });
    
    await fs.rename(fullOldPath, fullNewPath);
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Umbenennen:', error);
    throw error;
  }
});

// Basis-Verzeichnis abrufen
ipcMain.handle('fs:getBaseDir', () => {
  return EXCALINOTE_DIR;
});

// IPC Handlers für Bild-Operationen

// Hilfsfunktion: Bildordner-Pfad für eine Notiz generieren
function getImageFolderPath(notePath: string): string {
  return notePath.replace(/\.excalidraw$/, '.excalidraw.files');
}

// Bild-Datei schreiben
ipcMain.handle('fs:writeImageFile', async (_, notePath: string, imageId: string, base64Data: string, mimeType: string) => {
  try {
    const imageFolderPath = getImageFolderPath(notePath);
    const fullImageFolderPath = validateAndResolvePath(imageFolderPath);
    
    // Erstelle Bildordner falls nicht vorhanden
    await fs.mkdir(fullImageFolderPath, { recursive: true });
    
    // Extrahiere Dateiendung aus MIME-Type
    const extension = mimeType.split('/')[1] || 'png';
    const imageFileName = `${imageId}.${extension}`;
    const imageFilePath = path.join(imageFolderPath, imageFileName);
    const fullImageFilePath = validateAndResolvePath(imageFilePath);
    
    // Konvertiere Base64 zu Buffer und speichere
    const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64WithoutPrefix, 'base64');
    await fs.writeFile(fullImageFilePath, buffer);
    
    console.log(`[ImageStorage] Bild gespeichert: ${imageFilePath}`);
    return { success: true, path: imageFilePath };
  } catch (error) {
    console.error('[ImageStorage] Fehler beim Speichern des Bildes:', error);
    throw error;
  }
});

// Bild-Datei lesen
ipcMain.handle('fs:readImageFile', async (_, notePath: string, imageId: string) => {
  try {
    const imageFolderPath = getImageFolderPath(notePath);
    const fullImageFolderPath = validateAndResolvePath(imageFolderPath);
    
    // Suche nach der Bilddatei mit verschiedenen Endungen
    const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    
    for (const ext of possibleExtensions) {
      const imageFileName = `${imageId}.${ext}`;
      const imageFilePath = path.join(imageFolderPath, imageFileName);
      
      try {
        const fullImageFilePath = validateAndResolvePath(imageFilePath);
        const buffer = await fs.readFile(fullImageFilePath);
        const base64 = buffer.toString('base64');
        const mimeType = `image/${ext}`;
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        return { success: true, dataUrl, mimeType };
      } catch (err) {
        // Datei nicht gefunden, versuche nächste Endung
        continue;
      }
    }
    
    throw new Error(`Bild nicht gefunden: ${imageId}`);
  } catch (error) {
    console.error('[ImageStorage] Fehler beim Lesen des Bildes:', error);
    throw error;
  }
});

// Alle Bilder einer Notiz auflisten
ipcMain.handle('fs:listImageFiles', async (_, notePath: string) => {
  try {
    const imageFolderPath = getImageFolderPath(notePath);
    const fullImageFolderPath = validateAndResolvePath(imageFolderPath);
    
    try {
      const entries = await fs.readdir(fullImageFolderPath);
      return entries.map(entry => {
        const imageId = entry.replace(/\.\w+$/, '');
        return imageId;
      });
    } catch (err) {
      // Ordner existiert nicht - keine Bilder vorhanden
      return [];
    }
  } catch (error) {
    console.error('[ImageStorage] Fehler beim Auflisten der Bilder:', error);
    throw error;
  }
});

// Bild-Datei löschen
ipcMain.handle('fs:deleteImageFile', async (_, notePath: string, imageId: string) => {
  try {
    const imageFolderPath = getImageFolderPath(notePath);
    const fullImageFolderPath = validateAndResolvePath(imageFolderPath);
    
    // Suche und lösche alle Bilder mit dieser ID (verschiedene Endungen)
    const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    
    for (const ext of possibleExtensions) {
      const imageFileName = `${imageId}.${ext}`;
      const imageFilePath = path.join(imageFolderPath, imageFileName);
      
      try {
        const fullImageFilePath = validateAndResolvePath(imageFilePath);
        await fs.unlink(fullImageFilePath);
        console.log(`[ImageStorage] Bild gelöscht: ${imageFilePath}`);
      } catch (err) {
        // Datei nicht gefunden - ignorieren
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('[ImageStorage] Fehler beim Löschen des Bildes:', error);
    throw error;
  }
});

// IPC Handlers für Updates

// Update-Check
ipcMain.handle('updates:check', async () => {
  try {
    const result = await checkForUpdates();
    return result;
  } catch (error) {
    console.error('[Updates] Fehler beim Suchen nach Updates:', error);
    throw error;
  }
});

// Update installieren
ipcMain.handle('updates:install', async () => {
  try {
    // Erst herunterladen, dann installieren
    await downloadUpdate();
    // Nach Download wird automatisch das 'update-downloaded' Event gefeuert
    // Der Benutzer kann dann quitAndInstall aufrufen
    return { success: true };
  } catch (error) {
    console.error('[Updates] Fehler beim Installieren des Updates:', error);
    throw error;
  }
});

// Update installieren und neu starten (nach Download)
ipcMain.handle('updates:quitAndInstall', async () => {
  quitAndInstall();
  return { success: true };
});
