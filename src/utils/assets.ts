// Utility für Asset-Pfade - funktioniert in Development und Production (Electron)
export function getAssetPath(relativePath: string): string {
  // In Development (vite dev server)
  if (process.env.NODE_ENV === 'development') {
    return `/${relativePath}`;
  }
  
  // In Production (Electron build)
  // extraResources platziert Assets außerhalb der asar
  // __dirname zeigt auf app.asar, daher müssen wir 8 Zeichen entfernen
  try {
    // Für Node.js path module (wird über ipc verfügbar gemacht)
    if (window.electron) {
      // Dynamischer Import von path module über IPC
      return `/assets/${relativePath}`;
    }
  } catch (error) {
    console.warn('Asset path fallback:', error);
  }
  
  // Fallback für Browser oder wenn Electron nicht verfügbar
  return `/${relativePath}`;
}

// Spezielle Funktionen für häufig verwendete Assets
export const getBannerPath = () => getAssetPath('excalinotes_banner.png');
export const getIconPath = () => getAssetPath('excalinotes_icon.png');
