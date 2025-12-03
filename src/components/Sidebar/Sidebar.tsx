import { useState } from 'react';
import { useNotebookStore } from '../../store/notebookStore';
import FolderTree from './FolderTree';
import { Plus, FolderPlus, FileText } from 'lucide-react';

export default function Sidebar() {
  const { notebooks, createFolder, createNote } = useNotebookStore();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'folder' | 'note'>('note');
  const [selectedParent, setSelectedParent] = useState<string>('');

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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">ExcaliNote</h1>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-gray-200 flex gap-2">
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
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {newItemType === 'folder' ? 'Neuer Ordner' : 'Neue Notiz'}
          </div>
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
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
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
              className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {notebooks.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">
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
