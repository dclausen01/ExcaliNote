import { useNotebookStore } from '../../store/notebookStore';
import FolderTree from './FolderTree';

export default function Sidebar() {
  const { notebooks, theme } = useNotebookStore();
  
  // Dark/Light Mode Farben
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#121212]' : 'bg-white';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`w-64 ${bgColor} border-r ${borderColor} flex flex-col h-full`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h1 className={`text-xl font-bold ${textColor}`}>ExcaliNote</h1>
      </div>

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
