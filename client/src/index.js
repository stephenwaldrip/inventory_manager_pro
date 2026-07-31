import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ServerWakeUp from './components/ServerWakeUp';
import { initGA } from './utils/analytics';

initGA();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ServerWakeUp>
      <App />
    </ServerWakeUp>
  </React.StrictMode>
);


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}