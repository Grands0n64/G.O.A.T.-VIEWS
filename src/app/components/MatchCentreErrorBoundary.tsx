"use client";

import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: string };

export default class MatchCentreErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("G.O.A.T. VIEWS match centre render error:", error, info.componentStack);
    this.setState({ componentStack: info.componentStack || "" });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mc-backdrop">
          <section className="mc-modal" role="alert" aria-live="assertive">
            <div className="mc-topbar">
              <span>G.O.A.T. <b>VIEWS</b> <i>/</i> ERROR DIAGNOSTICS</span>
            </div>
            <div className="mc-content">
              <h2>Match centre encountered an error</h2>
              <p>The exact browser error is captured below so the cause can be fixed instead of guessed.</p>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: 14, borderRadius: 8, background: "#111827", color: "#fca5a5", fontSize: 12 }}>
                {this.state.error.name}: {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack || "No JavaScript stack was supplied."}
                {"\n\nComponent stack:\n"}
                {this.state.componentStack || "No component stack was supplied."}
              </pre>
              <button onClick={() => this.setState({ error: null, componentStack: "" })}>Try match centre again</button>
            </div>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
