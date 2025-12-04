import { useEffect } from 'react';
import { useNotebookStore } from './store/notebookStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sidebar from './components/Sidebar/Sidebar';
import Editor from './components/Editor/Editor';

function App() {
  const loadNotebooks = useNotebookStore((state) => state.loadNotebooks);

  useEffect(() => {
    // Beim Start: Notizbücher laden
    loadNotebooks();
  }, [loadNotebooks]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Editor-Bereich */}
        <div className="flex-1 flex flex-col">
          <Editor />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
