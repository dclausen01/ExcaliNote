import { BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { logger } from './logger';

/**
 * Extrahiert Bilder aus Excalidraw BinaryFiles und speichert sie als separate Dateien
 */
export async function saveImages(notePath: string, files: BinaryFiles): Promise<void> {
  if (!window.electron || !files) return;

  try {
    const fileIds = Object.keys(files);
    
    for (const fileId of fileIds) {
      const file = files[fileId];
      
      // Überspringe, wenn keine DataURL vorhanden ist
      if (!file.dataURL) continue;
      
      try {
        await window.electron.fs.writeImageFile(
          notePath,
          fileId,
          file.dataURL,
          file.mimeType
        );
        
        logger.info('[ImageStorage] Bild gespeichert', { notePath, fileId });
      } catch (error) {
        logger.error('[ImageStorage] Fehler beim Speichern des Bildes', { 
          notePath, 
          fileId, 
          error 
        });
      }
    }
  } catch (error) {
    logger.error('[ImageStorage] Fehler beim Speichern der Bilder', { 
      notePath, 
      error 
    });
  }
}

/**
 * Lädt alle Bilder einer Notiz und konvertiert sie zurück zu BinaryFiles
 */
export async function loadImages(notePath: string): Promise<BinaryFiles> {
  if (!window.electron) return {};

  try {
    const imageIds = await window.electron.fs.listImageFiles(notePath);
    const files: BinaryFiles = {};
    
    for (const imageId of imageIds) {
      try {
        const result = await window.electron.fs.readImageFile(notePath, imageId);
        
        if (result.success && result.dataUrl) {
          files[imageId] = {
            id: imageId,
            dataURL: result.dataUrl,
            mimeType: result.mimeType || 'image/png',
            created: Date.now(),
            lastRetrieved: Date.now(),
          };
          
          logger.info('[ImageStorage] Bild geladen', { notePath, imageId });
        }
      } catch (error) {
        logger.error('[ImageStorage] Fehler beim Laden des Bildes', { 
          notePath, 
          imageId, 
          error 
        });
      }
    }
    
    return files;
  } catch (error) {
    logger.error('[ImageStorage] Fehler beim Laden der Bilder', { 
      notePath, 
      error 
    });
    return {};
  }
}

/**
 * Löscht Bilder, die nicht mehr in den aktuellen Files vorhanden sind
 */
export async function cleanupUnusedImages(
  notePath: string, 
  currentFiles: BinaryFiles
): Promise<void> {
  if (!window.electron) return;

  try {
    const savedImageIds = await window.electron.fs.listImageFiles(notePath);
    const currentFileIds = Object.keys(currentFiles);
    
    // Finde Bilder, die gelöscht werden sollen
    const imagesToDelete = savedImageIds.filter(
      (imageId: string) => !currentFileIds.includes(imageId)
    );
    
    // Lösche nicht mehr verwendete Bilder
    for (const imageId of imagesToDelete) {
      try {
        await window.electron.fs.deleteImageFile(notePath, imageId);
        logger.info('[ImageStorage] Ungenutztes Bild gelöscht', { 
          notePath, 
          imageId 
        });
      } catch (error) {
        logger.error('[ImageStorage] Fehler beim Löschen des Bildes', { 
          notePath, 
          imageId, 
          error 
        });
      }
    }
  } catch (error) {
    logger.error('[ImageStorage] Fehler beim Cleanup der Bilder', { 
      notePath, 
      error 
    });
  }
}
