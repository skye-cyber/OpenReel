import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 font-mono text-[12px]">
          <div className="text-danger mb-2">
            Error in {this.props.label ?? 'component'}
          </div>
          <div className="text-text-2 mb-4">{this.state.error.message}</div>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-accent underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
