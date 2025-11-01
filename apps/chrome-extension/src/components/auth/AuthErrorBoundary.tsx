import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Authentication error caught:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-nb-dark-100">
          <div className="max-w-md w-full bg-nb-dark-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-red-400">
              Authentication Error
            </h2>
            <div className="space-y-2">
              <p className="text-nb-gray-300">
                {this.state.error?.message || "An authentication error occurred"}
              </p>
              <details className="text-sm text-nb-gray-400">
                <summary className="cursor-pointer hover:text-nb-gray-300">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-nb-dark-300 rounded overflow-auto text-xs">
                  {this.state.error?.stack}
                </pre>
              </details>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-nb-blue hover:bg-nb-blue-dark text-white rounded transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-gray-300 rounded transition-colors"
              >
                Reload Extension
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
