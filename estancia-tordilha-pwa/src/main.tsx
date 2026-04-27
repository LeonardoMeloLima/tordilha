import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Captura o evento de instalação PWA antes do React montar (ele dispara muito cedo)
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
});

createRoot(document.getElementById("root")!).render(<App />);
