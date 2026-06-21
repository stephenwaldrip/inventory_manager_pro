import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ServerWakeUp from './components/ServerWakeUp';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ServerWakeUp>
      <App />
    </ServerWakeUp>
  </React.StrictMode>
);