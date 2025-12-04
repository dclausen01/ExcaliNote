import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-screen bg-red-50">
            <div className="text-center p-6 max-w-md">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Etwas ist schief gelaufen
              </h1>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || 'Unbekannter Fehler'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                App neu laden
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
