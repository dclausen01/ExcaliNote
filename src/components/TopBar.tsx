import { Menu, Grid, Sun, Moon, Grid3X3 } from 'lucide-react';
import { useNotebookStore } from '../store/notebookStore';

export default function TopBar() {
  const { 
    sidebarDocked, 
    setSidebarDocked, 
    theme, 
    setTheme,
    showGrid,
    setShowGrid
  } = useNotebookStore();

  const isDark = theme === 'dark';
  
  // Styles based on theme
  const bgColor = isDark ? 'bg-[#1F1B18]' : 'bg-[#FDFBF7]';
  const borderColor = isDark ? 'border-[#3D3530]' : 'border-[#E8E4DB]';
  const iconColor = isDark ? 'text-[#E8DFD0]' : 'text-[#3D3530]';
  const hoverBg = isDark ? 'hover:bg-[#2B2520]' : 'hover:bg-[#F5F2E3]';
  const activeBg = isDark ? 'bg-[#3D3530]' : 'bg-[#E8E4DB]';

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

      <div className={`h-4 w-px ${borderColor} mx-2`} />

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
      
      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
