import { ErrorBoundary } from './components/ErrorBoundary';
import Editor from './components/Editor/Editor';
import UpdateNotification from './components/UpdateNotification';

function App() {
  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden">
        {/* Editor nimmt den gesamten Platz ein - Sidebar ist jetzt integriert */}
        <Editor />
        
        {/* Update-Benachrichtigung */}
        <UpdateNotification />
      </div>
    </ErrorBoundary>
  );
}

export default App;
