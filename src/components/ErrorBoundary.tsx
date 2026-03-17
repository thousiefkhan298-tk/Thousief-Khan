import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirebaseError = false;

      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          isFirebaseError = true;
          errorMessage = `Database Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
          <div className="bg-neutral-900 border border-neutral-800 p-10 rounded-[2.5rem] max-w-lg w-full text-center">
            <h2 className="text-3xl font-display italic uppercase text-white mb-4">System Malfunction</h2>
            <div className="bg-red-950/30 border border-red-900/50 p-6 rounded-2xl mb-6">
              <p className="text-red-500 font-mono text-xs break-words">
                {errorMessage}
              </p>
            </div>
            {isFirebaseError && (
              <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-widest mb-8">
                This usually indicates a permission issue or a configuration error in Firebase.
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
