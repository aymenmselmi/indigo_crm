import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>Something went wrong</div>
          <div style={{ fontSize: 12.5, marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>{this.state.error.message}</div>
          <button
            className="btn sm"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
