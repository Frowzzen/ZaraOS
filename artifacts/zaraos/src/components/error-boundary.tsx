import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Intentionally no external error reporting — local-first privacy model.
    // In a future Tauri build, this could write to a local crash log.
    void error;
    void info;
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">ZaraOS encountered an error</h2>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                A runtime error occurred in this panel. No data was transmitted externally.
                All processing remains local.
              </p>
              {this.state.error?.message && (
                <p className="mt-3 text-xs text-red-400/70 font-mono bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-3">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors" style={{ background: "linear-gradient(145deg,#ffffff,#f0f2f8)", border: "1px solid rgba(148,163,184,0.22)", boxShadow: "3px 3px 8px rgba(166,180,200,0.28), -2px -2px 6px rgba(255,255,255,0.88)" }}
              >
                Restart ZaraOS
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
