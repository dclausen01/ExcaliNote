import { useEffect, useState } from 'react';
import { useNotebookStore } from './store/notebookStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sidebar from './components/Sidebar/Sidebar';
import Editor from './components/Editor/Editor';

function App() {
  const loadNotebooks = useNotebookStore((state) => state.loadNotebooks);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Beim Start: Notizbücher laden
    loadNotebooks();
  }, [loadNotebooks]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
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
      </div>
    </ErrorBoundary>
  );
}

export default App;
