import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals-optimized.css";
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
} else {
  console.error("Root element not found!");
}
