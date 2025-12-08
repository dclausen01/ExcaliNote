import { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Trash2, Edit } from 'lucide-react';
import { useNotebookStore, joinPath } from '../../store/notebookStore';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { 
    currentNote, 
    setCurrentNote, 
    deleteItem, 
    renameItem, 
    theme,
    expandedFolders,
    toggleFolder
  } = useNotebookStore();
  
  const isSelected = currentNote === item.path;
  const isOpen = expandedFolders.has(item.path);
  
  // Dark/Light Mode Farben
  const isDark = theme === 'dark';
  const hoverBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
  const selectedBg = isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-800';
  const iconColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const selectedIconColor = isDark ? 'text-blue-400' : 'text-blue-600';
  const actionHoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200';
  const deleteHoverBg = isDark ? 'hover:bg-red-900' : 'hover:bg-red-100';
  const inputBorder = isDark ? 'border-blue-400' : 'border-blue-500';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';

  const handleClick = () => {
    if (item.type === 'note') {
      setCurrentNote(item.path);
    } else {
      toggleFolder(item.path);
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
      // Improved path handling
      const parentPath = item.path.lastIndexOf('/') !== -1 
        ? item.path.substring(0, item.path.lastIndexOf('/'))
        : '';
        
      const nameToUse = item.type === 'note' 
        ? (editName.endsWith('.excalidraw') ? editName : `${editName}.excalidraw`)
        : editName;
      
      const newPath = joinPath(parentPath, nameToUse);
      
      await renameItem(item.path, newPath);
      setIsEditing(false);
    } catch (error) {
      alert('Fehler beim Umbenennen');
      setEditName(item.name);
      setIsEditing(false);
    }
  };

  // Drag & Drop Handler
  const handleDragStart = (e: React.DragEvent) => {
    // Allow dragging both files and folders
    e.dataTransfer.setData('text/plain', item.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (item.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (item.type === 'folder') {
      const draggedPath = e.dataTransfer.getData('text/plain');
      
      if (draggedPath && draggedPath !== item.path) {
        // Prevent moving folder into itself
        if (item.path.startsWith(draggedPath + '/') || item.path === draggedPath) {
          return;
        }

        try {
          // Improved path handling
          const draggedFileName = draggedPath.lastIndexOf('/') !== -1
            ? draggedPath.substring(draggedPath.lastIndexOf('/') + 1)
            : draggedPath;
            
          const newPath = joinPath(item.path, draggedFileName);
          
          await renameItem(draggedPath, newPath);
        } catch (error) {
          alert('Fehler beim Verschieben');
        }
      }
    }
  };

  const paddingLeft = level * 12 + 8;

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded group
          ${isSelected ? selectedBg : hoverBg}
          ${isDragOver && item.type === 'folder' ? 'bg-green-100 border-2 border-green-300 border-dashed' : ''}
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        draggable={true} // Allow dragging everything
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Chevron für Ordner */}
        {item.type === 'folder' && (
          <span className={iconColor}>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
        
        {/* Icon */}
        <span className={isSelected ? selectedIconColor : iconColor}>
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
            className={`flex-1 px-1 py-0 border ${inputBorder} ${inputBg} ${textColor} rounded text-sm`}
            autoFocus
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${textColor}`}>
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
              className={`p-1 ${actionHoverBg} rounded`}
              title="Umbenennen"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={handleDelete}
              className={`p-1 ${deleteHoverBg} text-red-600 rounded`}
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
