import React from 'react';

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application render failed:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-900 p-6 text-gray-100">
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/40 bg-gray-800 p-6 shadow-2xl">
            <h1 className="mb-3 text-2xl font-bold text-red-300">The app could not render.</h1>
            <p className="mb-4 text-gray-300">
              Please clear the saved browser data for this app and refresh. If the issue continues, share the error below.
            </p>
            <pre className="overflow-auto rounded bg-gray-950 p-3 text-sm text-red-200">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
