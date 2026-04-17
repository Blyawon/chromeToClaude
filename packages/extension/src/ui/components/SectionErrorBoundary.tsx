import * as React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[chrome-to-claude] section crashed:", error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="px-s-400 py-s-300 text-t-md text-accent-danger">
          <div>A section crashed. See console for details.</div>
          <button
            type="button"
            onClick={this.reset}
            className="mt-s-200 text-t-sm underline text-text-default"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
