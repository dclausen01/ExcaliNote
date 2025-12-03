import { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Trash2, Edit } from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';
import type { NotebookItem } from '../../types';

interface FolderTreeProps {
  items: NotebookItem[];
  level: number;
}

export default function FolderTree({ items, level }: FolderTreeProps) {
  return (
    <div>
      {items.map((item) => (
        <TreeItem key={item.id} item={item} level={level} />
      ))}
    </div>
  );
}

interface TreeItemProps {
  item: NotebookItem;
  level: number;
}

function TreeItem({ item, level }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  
  const { currentNote, setCurrentNote, deleteItem, renameItem } = useNotebookStore();
  const isSelected = currentNote === item.path;

  const handleClick = () => {
    if (item.type === 'note') {
      setCurrentNote(item.path);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmMsg = item.type === 'folder'
      ? `Möchtest du den Ordner "${item.name}" und alle Inhalte wirklich löschen?`
      : `Möchtest du die Notiz "${item.name}" wirklich löschen?`;
    
    if (window.confirm(confirmMsg)) {
      try {
        await deleteItem(item.path);
      } catch (error) {
        alert('Fehler beim Löschen');
      }
    }
  };

  const handleRename = async () => {
    if (!editName.trim() || editName === item.name) {
      setIsEditing(false);
      setEditName(item.name);
      return;
    }

    try {
      const pathParts = item.path.split('/');
      pathParts[pathParts.length - 1] = item.type === 'note' 
        ? (editName.endsWith('.excalidraw') ? editName : `${editName}.excalidraw`)
        : editName;
      const newPath = pathParts.join('/');
      
      await renameItem(item.path, newPath);
      setIsEditing(false);
    } catch (error) {
      alert('Fehler beim Umbenennen');
      setEditName(item.name);
      setIsEditing(false);
    }
  };

  const paddingLeft = level * 12 + 8;

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded group
          ${isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
      >
        {/* Chevron für Ordner */}
        {item.type === 'folder' && (
          <span className="text-gray-500">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
        
        {/* Icon */}
        <span className={isSelected ? 'text-blue-600' : 'text-gray-600'}>
          {item.type === 'folder' ? (
            isOpen ? <FolderOpen size={16} /> : <Folder size={16} />
          ) : (
            <FileText size={16} />
          )}
        </span>

        {/* Name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditName(item.name);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0 border border-blue-500 rounded text-sm"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm truncate">
            {item.type === 'note' ? item.name.replace('.excalidraw', '') : item.name}
          </span>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Umbenennen"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
              title="Löschen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Children für Ordner */}
      {item.type === 'folder' && isOpen && item.children && (
        <FolderTree items={item.children} level={level + 1} />
      )}
    </div>
  );
}
