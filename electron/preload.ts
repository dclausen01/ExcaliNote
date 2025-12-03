import { contextBridge, ipcRenderer } from 'electron';

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
  },
};

// Exponiere die API an den Renderer-Prozess
contextBridge.exposeInMainWorld('electron', electronAPI);

// TypeScript-Typen für window.electron
export type ElectronAPI = typeof electronAPI;
