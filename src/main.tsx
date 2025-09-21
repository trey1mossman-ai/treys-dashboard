import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { Routes } from "@/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/hooks/use-toast";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Service worker registration is managed via the usePWA hook within the app shell.
} else {
  console.error("Root element not found!");
}
