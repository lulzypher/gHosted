// Import polyfills first to ensure Node.js compatibility in browser
import './lib/polyfills';

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/sw-registration";

// Register service worker for offline functionality
registerServiceWorker().catch(console.error);

// Add RemixIcon for icons used in the design
const remixIconLink = document.createElement('link');
remixIconLink.rel = 'stylesheet';
remixIconLink.href = 'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css';
document.head.appendChild(remixIconLink);

// Add Inter font for typography
const interFontLink = document.createElement('link');
interFontLink.rel = 'stylesheet';
interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
document.head.appendChild(interFontLink);

// Add title
const title = document.createElement('title');
title.textContent = 'gHosted - Decentralized Social Media';
document.head.appendChild(title);

// Create the app
createRoot(document.getElementById("root")!).render(<App />);
