import { useEffect, useState } from 'react';
import { useNotebookStore } from './store/notebookStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sidebar from './components/Sidebar/Sidebar';
import Editor from './components/Editor/Editor';
import UpdateNotification from './components/UpdateNotification';

function App() {
  const loadNotebooks = useNotebookStore((state) => state.loadNotebooks);
  const theme = useNotebookStore((state) => state.theme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Beim Start: Notizbücher laden
    loadNotebooks();
  }, [loadNotebooks]);

  return (
    <ErrorBoundary>
      <div className={`flex h-screen w-screen overflow-hidden ${
        theme === 'dark' ? 'bg-[#2B2520]' : 'bg-[#F5F2E3]'
      }`}>
        {/* Sidebar - nur anzeigen wenn nicht collapsed */}
        {!sidebarCollapsed && (
          <Sidebar />
        )}
        
        {/* Editor-Bereich */}
        <div className="flex-1 flex flex-col">
          <Editor 
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </div>
        
        {/* Update-Benachrichtigung */}
        <UpdateNotification />
      </div>
    </ErrorBoundary>
  );
}

export default App;
