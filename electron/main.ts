import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { homedir } from 'os';

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
