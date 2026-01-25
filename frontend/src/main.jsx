import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import { brandingConfig } from './config/branding';

const setMetaContent = (selector, content) => {
  const element = document.querySelector(selector);
  if (element && content) {
    element.setAttribute('content', content);
  }
};

const { appName, appShortName, appDescription } = brandingConfig;
document.title = appName;
setMetaContent('meta[name="description"]', appDescription);
setMetaContent('meta[name="apple-mobile-web-app-title"]', appShortName);

// Global error handler for Monaco cancellation errors
window.addEventListener('unhandledrejection', (event) => {
  // Handle Monaco editor cancellation errors gracefully
  if (event.reason && event.reason.message && event.reason.message.includes('Canceled')) {
    console.log('Monaco operation cancelled gracefully (global handler)');
    event.preventDefault(); // Prevent the error from being logged as uncaught
  }
});

// Global error handler for synchronous Monaco errors
window.addEventListener('error', (event) => {
  // Handle Monaco editor cancellation errors gracefully
  if (event.error && event.error.message && event.error.message.includes('Canceled')) {
    console.log('Monaco operation cancelled gracefully (global sync handler)');
    event.preventDefault(); // Prevent the error from being logged as uncaught
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Temporarily disabled StrictMode to fix input lag
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
