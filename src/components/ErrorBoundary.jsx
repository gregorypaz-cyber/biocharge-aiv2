import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground gap-4 p-8 text-center">
          <p className="text-lg font-semibold">Algo deu errado. Recarregue o app.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}