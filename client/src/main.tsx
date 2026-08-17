import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { OfflineBanner } from "./components/OfflineBanner";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OfflineBanner />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Removes the native-splash overlay (index.html) once the real app has
// actually painted — double rAF waits for a committed frame rather than
// just the render() call returning.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.getElementById("native-splash")?.remove();
  });
});
