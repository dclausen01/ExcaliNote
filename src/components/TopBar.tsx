import { useState, useEffect } from 'react';
import { Menu, Grid, Sun, Moon, Grid3X3, Plus } from 'lucide-react';
import { useNotebookStore } from '../store/notebookStore';

export default function TopBar() {
  const { 
    sidebarDocked, 
    setSidebarDocked, 
    theme, 
    setTheme,
    showGrid,
    setShowGrid,
    currentNote,
    createNote,
    renameItem,
    notebooks
  } = useNotebookStore();

  const [noteName, setNoteName] = useState('');

  // Sync Name mit aktueller Notiz
  useEffect(() => {
    if (currentNote) {
      const parts = currentNote.split('/');
      const fileName = parts[parts.length - 1].replace('.excalidraw', '');
      setNoteName(fileName);
    } else {
      setNoteName('');
    }
  }, [currentNote]);

  const handleRename = async () => {
    if (!currentNote || !noteName.trim()) return;
    
    const parts = currentNote.split('/');
    const oldName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const newFileName = noteName.endsWith('.excalidraw') ? noteName : `${noteName}.excalidraw`;
    
    if (oldName === newFileName) return;
    
    const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName;
    
    try {
      await renameItem(currentNote, newPath);
    } catch (error) {
      console.error('Rename failed', error);
      // Reset name on error
      const fileName = oldName.replace('.excalidraw', '');
      setNoteName(fileName);
    }
  };

  const handleCreateNew = async () => {
    try {
      // Finde einen eindeutigen Namen "Unbenannt", "Unbenannt (1)", etc.
      let baseName = "Unbenannt";
      let candidate = baseName;
      let counter = 1;
      
      // Prüfe ob Name im Hauptverzeichnis existiert
      const exists = (name: string) => {
        const fileName = name.endsWith('.excalidraw') ? name : `${name}.excalidraw`;
        return notebooks.some(item => item.name === fileName);
      };
      
      while (exists(candidate)) {
        candidate = `${baseName} (${counter})`;
        counter++;
      }
      
      await createNote('', candidate);
    } catch (error) {
      console.error('Failed to create note', error);
    }
  };

  const isDark = theme === 'dark';
  
  // Styles based on theme
  const bgColor = isDark ? 'bg-[#121212]' : 'bg-white';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const iconColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const hoverBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-gray-800' : 'bg-gray-200';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-700' : 'border-gray-300';

  return (
    <div className={`h-10 border-b ${borderColor} ${bgColor} flex items-center px-4 gap-2 flex-shrink-0`}>
      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarDocked(!sidebarDocked)}
        className={`p-1.5 rounded transition-colors ${hoverBg} ${!sidebarDocked ? activeBg : ''} ${iconColor}`}
        title={sidebarDocked ? "Sidebar ausblenden" : "Sidebar einblenden"}
      >
        <Menu size={18} />
      </button>

      {/* New Note Button */}
      <button
        onClick={handleCreateNew}
        className={`p-1.5 rounded transition-colors ${hoverBg} ${iconColor}`}
        title="Neue Notiz erstellen"
      >
        <Plus size={18} />
      </button>

      <div className={`h-4 w-px ${borderColor} mx-2`} />

      {/* Title Input (nur wenn Notiz aktiv) */}
      {currentNote && (
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={noteName}
            onChange={(e) => setNoteName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={`w-full px-2 py-0.5 text-sm rounded border ${inputBorder} ${inputBg} ${iconColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="Notizname..."
          />
        </div>
      )}
      
      {/* Spacer to push buttons to right if no note */}
      {!currentNote && <div className="flex-1" />}

      {/* Grid Toggle */}
      <button
        onClick={() => setShowGrid(!showGrid)}
        className={`p-1.5 rounded transition-colors ${hoverBg} ${showGrid ? activeBg : ''} ${iconColor}`}
        title={showGrid ? "Raster ausblenden" : "Raster anzeigen"}
      >
        {showGrid ? <Grid3X3 size={18} /> : <Grid size={18} />}
      </button>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`p-1.5 rounded transition-colors ${hoverBg} ${iconColor}`}
        title={isDark ? "Heller Modus" : "Dunkler Modus"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
