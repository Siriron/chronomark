import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
          <p className="font-mono text-sm text-late">Chronomark hit an unexpected error.</p>
          <p className="mt-2 max-w-md font-mono text-xs text-textMuted">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-md border border-border bg-surface px-4 py-2 font-mono text-xs text-textPrimary hover:border-verifiedDim/50"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
