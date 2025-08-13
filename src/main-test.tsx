import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

const TestApp = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold text-primary">React is Working!</h1>
      <p className="text-muted-foreground mt-4">If you see this, React is rendering correctly.</p>
      <div className="mt-8 p-4 bg-card border border-border rounded-lg">
        <h2 className="text-xl text-accent">Theme Test</h2>
        <p>Background: Dark</p>
        <p>Card: Slightly lighter panel</p>
        <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded">Test Button</button>
      </div>
    </div>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
}