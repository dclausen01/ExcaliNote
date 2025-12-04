import { useState, useMemo } from 'react';
import { useNotebookStore } from '../../store/notebookStore';
import FolderTree from './FolderTree';
import { Plus, FolderPlus, FileText } from 'lucide-react';
import type { NotebookItem } from '../../types';

// Hilfsfunktion: Pfade sicher zusammenfügen
function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

export default function Sidebar() {
  const { notebooks, createFolder, createNote, theme } = useNotebookStore();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'folder' | 'note'>('note');
  const [selectedParent, setSelectedParent] = useState<string>('');
  
  // Dark/Light Mode Farben
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#1F1B18]' : 'bg-[#FDFBF7]';
  const borderColor = isDark ? 'border-[#3D3530]' : 'border-[#E8E4DB]';
  const textColor = isDark ? 'text-[#E8DFD0]' : 'text-[#3D3530]';
  const textSecondary = isDark ? 'text-[#A39988]' : 'text-[#6B5D4F]';
  const hoverBg = isDark ? 'hover:bg-[#2B2520]' : 'hover:bg-[#F5F2E3]';
  const inputBg = isDark ? 'bg-[#2B2520]' : 'bg-white';
  const inputBorder = isDark ? 'border-[#3D3530]' : 'border-[#D4CFC4]';
  const dialogBg = isDark ? 'bg-[#2B2520]' : 'bg-[#F5F2E3]';

  // Funktion um alle Ordner zu finden (mit useMemo für Performance)
  const allFolders = useMemo(() => {
    const getAllFolders = (items: NotebookItem[], path: string = ''): { name: string; path: string }[] => {
      const folders: { name: string; path: string }[] = [];
      
      for (const item of items) {
        if (item.type === 'folder') {
          const folderPath = joinPath(path, item.name);
          folders.push({
            name: folderPath,
            path: folderPath,
          });
          
          if (item.children) {
            const childFolders = getAllFolders(item.children, folderPath);
            folders.push(...childFolders);
          }
        }
      }
      
      return folders;
    };
    
    return getAllFolders(notebooks);
  }, [notebooks]);

  const handleCreate = async () => {
    if (!newItemName.trim()) return;

    try {
      if (newItemType === 'folder') {
        await createFolder(selectedParent, newItemName);
      } else {
        await createNote(selectedParent, newItemName);
      }
      
      // Reset
      setNewItemName('');
      setShowNewMenu(false);
      setSelectedParent('');
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
      alert('Fehler beim Erstellen des Elements');
    }
  };

  return (
    <div className={`w-64 ${bgColor} border-r ${borderColor} flex flex-col`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h1 className={`text-xl font-bold ${textColor}`}>ExcaliNote</h1>
      </div>

      {/* Toolbar */}
      <div className={`p-2 border-b ${borderColor} flex gap-2`}>
        <button
          onClick={() => {
            setNewItemType('note');
            setShowNewMenu(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          title="Neue Notiz"
        >
          <FileText size={16} />
          <span className="text-sm">Notiz</span>
        </button>
        <button
          onClick={() => {
            setNewItemType('folder');
            setShowNewMenu(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          title="Neuer Ordner"
        >
          <FolderPlus size={16} />
          <span className="text-sm">Ordner</span>
        </button>
      </div>

      {/* New Item Dialog */}
      {showNewMenu && (
        <div className={`p-3 ${dialogBg} border-b ${borderColor}`}>
          <div className={`text-sm font-medium ${textColor} mb-2`}>
            {newItemType === 'folder' ? 'Neuer Ordner' : 'Neue Notiz'}
          </div>
          
          {/* Parent Folder Selection */}
          <div className="mb-2">
            <label className={`block text-xs font-medium ${textSecondary} mb-1`}>
              Speicherort:
            </label>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className={`w-full px-2 py-1 border ${inputBorder} ${inputBg} ${textColor} rounded text-sm`}
            >
              <option value="">Hauptverzeichnis</option>
              {allFolders.map((folder) => (
                <option key={folder.path} value={folder.path}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Name Input */}
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setShowNewMenu(false);
                setNewItemName('');
              }
            }}
            placeholder={newItemType === 'folder' ? 'Ordnername' : 'Notizname'}
            className={`w-full px-2 py-1 border ${inputBorder} ${inputBg} ${textColor} rounded text-sm mb-2`}
            autoFocus
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Erstellen
            </button>
            <button
              onClick={() => {
                setShowNewMenu(false);
                setNewItemName('');
              }}
              className={`flex-1 px-2 py-1 ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-300 text-gray-700'} rounded text-sm ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-400'}`}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {notebooks.length === 0 ? (
          <div className={`text-center ${textSecondary} text-sm mt-8`}>
            <p>Keine Notizbücher vorhanden</p>
            <p className="mt-2">Erstelle deine erste Notiz oder einen Ordner!</p>
          </div>
        ) : (
          <FolderTree items={notebooks} level={0} />
        )}
      </div>
    </div>
  );
}
