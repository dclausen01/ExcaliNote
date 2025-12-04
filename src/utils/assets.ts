// Utility für Asset-Pfade - funktioniert in Development und Production (Electron)
export function getAssetPath(relativePath: string): string {
  // In Development (vite dev server)
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    return `/${relativePath}`;
  }
  
  // In Production (Electron build)
  // extraResources platziert Assets im resources/assets Ordner
  // Diese sind über den Pfad /assets/ verfügbar
  return `/assets/${relativePath}`;
}

// Spezielle Funktionen für häufig verwendete Assets
export const getBannerPath = () => getAssetPath('excalinotes_banner.png');
export const getIconPath = () => getAssetPath('excalinotes_icon.png');
