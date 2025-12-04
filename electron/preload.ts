import { contextBridge, ipcRenderer } from 'electron';

// Update Info Interface
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

// Definiere die API, die dem Renderer-Prozess zur Verfügung steht
const electronAPI = {
  // Dateisystem-Operationen
  fs: {
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => 
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    createDir: (dirPath: string) => ipcRenderer.invoke('fs:createDir', dirPath),
    delete: (itemPath: string) => ipcRenderer.invoke('fs:delete', itemPath),
    rename: (oldPath: string, newPath: string) => 
      ipcRenderer.invoke('fs:rename', oldPath, newPath),
    getBaseDir: () => ipcRenderer.invoke('fs:getBaseDir'),
    // Bild-Operationen
    writeImageFile: (notePath: string, imageId: string, base64Data: string, mimeType: string) =>
      ipcRenderer.invoke('fs:writeImageFile', notePath, imageId, base64Data, mimeType),
    readImageFile: (notePath: string, imageId: string) =>
      ipcRenderer.invoke('fs:readImageFile', notePath, imageId),
    listImageFiles: (notePath: string) =>
      ipcRenderer.invoke('fs:listImageFiles', notePath),
    deleteImageFile: (notePath: string, imageId: string) =>
      ipcRenderer.invoke('fs:deleteImageFile', notePath, imageId),
  },
  // Update-Operationen
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('updates:check'),
    installUpdate: () => ipcRenderer.invoke('updates:install'),
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
      const subscription = (_event: any, info: UpdateInfo) => callback(info);
      ipcRenderer.on('update-available', subscription);
      return () => ipcRenderer.removeListener('update-available', subscription);
    },
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
      const subscription = (_event: any, info: UpdateInfo) => callback(info);
      ipcRenderer.on('update-downloaded', subscription);
      return () => ipcRenderer.removeListener('update-downloaded', subscription);
    },
    onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
      const subscription = (_event: any, progress: { percent: number }) => callback(progress);
      ipcRenderer.on('download-progress', subscription);
      return () => ipcRenderer.removeListener('download-progress', subscription);
    },
    onUpdateError: (callback: (error: string) => void) => {
      const subscription = (_event: any, error: string) => callback(error);
      ipcRenderer.on('update-error', subscription);
      return () => ipcRenderer.removeListener('update-error', subscription);
    },
  },
};

// Exponiere die API an den Renderer-Prozess
contextBridge.exposeInMainWorld('electron', electronAPI);

// TypeScript-Typen für window.electron
export type ElectronAPI = typeof electronAPI;
