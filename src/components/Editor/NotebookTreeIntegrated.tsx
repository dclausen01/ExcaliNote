import React, { useState } from 'react';
import { useNotebookStore } from '../../store/notebookStore';
import { FolderPlus, FilePlus, ChevronRight, ChevronDown, Folder, FileText, Trash2, Edit2 } from 'lucide-react';
import type { NotebookItem } from '../../types';
import { logger } from '../../utils/logger';

export const NotebookTreeIntegrated: React.FC = () => {
  const { 
    notebooks,
    currentNote,
    setCurrentNote,
    createFolder,
    createNote,
    deleteItem,
    expandedFolders,
    toggleFolder,
  } = useNotebookStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: NotebookItem } | null>(null);

  // Notiz auswählen
  const handleSelectNote = (path: string) => {
    setCurrentNote(path);
    logger.info('[NotebookTree] Notiz ausgewählt', { path });
  };

  // Neuen Ordner erstellen
  const handleCreateFolder = async (parentPath: string = '') => {
    const name = prompt('Ordnername:');
    if (name) {
      try {
        await createFolder(parentPath, name);
        logger.info('[NotebookTree] Ordner erstellt', { parentPath, name });
      } catch (error) {
        logger.error('[NotebookTree] Fehler beim Erstellen des Ordners', { error });
        alert('Fehler beim Erstellen des Ordners');
      }
    }
  };

  // Neue Notiz erstellen
  const handleCreateNote = async (parentPath: string = '') => {
    const name = prompt('Notizname:');
    if (name) {
      try {
        await createNote(parentPath, name);
        logger.info('[NotebookTree] Notiz erstellt', { parentPath, name });
      } catch (error) {
        logger.error('[NotebookTree] Fehler beim Erstellen der Notiz', { error });
        alert('Fehler beim Erstellen der Notiz');
      }
    }
  };

  // Item löschen
  const handleDelete = async (path: string) => {
    if (confirm('Möchten Sie dieses Element wirklich löschen?')) {
      try {
        await deleteItem(path);
        logger.info('[NotebookTree] Element gelöscht', { path });
      } catch (error) {
        logger.error('[NotebookTree] Fehler beim Löschen', { error });
        alert('Fehler beim Löschen');
      }
    }
  };

  // Rekursives Rendern des Baums
  const renderTreeItem = (item: NotebookItem, depth: number = 0): React.ReactNode => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = currentNote === item.path;

    return (
      <div key={item.id}>
        <div
          className={`tree-item ${isSelected ? 'selected' : ''}`}
          data-depth={depth}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(item.id);
            } else {
              handleSelectNote(item.path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, item });
          }}
        >
          {isFolder && (
            <span className="tree-item-toggle">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <span className="tree-item-icon">
            {isFolder ? <Folder size={16} /> : <FileText size={16} />}
          </span>
          <span className="tree-item-label">
            {item.name.replace('.excalidraw', '')}
          </span>
        </div>

        {/* Render children if folder is expanded */}
        {isFolder && isExpanded && item.children && (
          <div className="tree-item-children">
            {item.children.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="notebook-tree-integrated">
      {/* Toolbar */}
      <div className="tree-toolbar">
        <button 
          onClick={() => handleCreateFolder('')}
          className="tree-toolbar-button"
          title="Neuer Ordner"
        >
          <FolderPlus size={16} />
        </button>
        <button 
          onClick={() => handleCreateNote('')}
          className="tree-toolbar-button"
          title="Neue Notiz"
        >
          <FilePlus size={16} />
        </button>
      </div>
      
      {/* Tree */}
      <div className="tree-content">
        {notebooks.length === 0 ? (
          <div className="tree-empty">
            <p>Keine Notizen vorhanden</p>
            <p className="text-xs text-gray-500 mt-2">
              Erstelle einen Ordner oder eine Notiz, um zu beginnen.
            </p>
          </div>
        ) : (
          notebooks.map((item) => renderTreeItem(item))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.item.type === 'folder' && (
              <>
                <button
                  onClick={() => {
                    handleCreateFolder(contextMenu.item.path);
                    setContextMenu(null);
                  }}
                >
                  <FolderPlus size={14} />
                  Neuer Ordner
                </button>
                <button
                  onClick={() => {
                    handleCreateNote(contextMenu.item.path);
                    setContextMenu(null);
                  }}
                >
                  <FilePlus size={14} />
                  Neue Notiz
                </button>
                <div className="context-menu-separator" />
              </>
            )}
            <button
              onClick={() => {
                handleDelete(contextMenu.item.path);
                setContextMenu(null);
              }}
              className="context-menu-danger"
            >
              <Trash2 size={14} />
              Löschen
            </button>
          </div>
        </>
      )}
    </div>
  );
};
