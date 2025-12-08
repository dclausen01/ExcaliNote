import { ErrorBoundary } from './components/ErrorBoundary';
import Editor from './components/Editor/Editor';
import Sidebar from './components/Sidebar/Sidebar';
import TopBar from './components/TopBar';
import UpdateNotification from './components/UpdateNotification';
import { useNotebookStore } from './store/notebookStore';

function App() {
  const { sidebarDocked } = useNotebookStore();

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-white">
        {/* Sidebar */}
        {sidebarDocked && (
          <div className="h-full flex-shrink-0">
            <Sidebar />
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 h-full relative flex flex-col min-w-0">
          <TopBar />
          <div className="flex-1 relative">
            <Editor />
          </div>
          <UpdateNotification />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
