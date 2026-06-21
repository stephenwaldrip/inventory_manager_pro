import { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function ServerWakeUp({ children }) {
  const [ready, setReady] = useState(false);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let timer;

    const checkServer = async () => {
      timer = setTimeout(() => setWaking(true), 2000);

      try {
        await fetch(`${API_BASE}/health`);
        setReady(true);
      } catch (err) {
        setTimeout(async () => {
          try {
            await fetch(`${API_BASE}/health`);
          } finally {
            setReady(true);
          }
        }, 5000);
      } finally {
        clearTimeout(timer);
      }
    };

    checkServer();
    return () => clearTimeout(timer);
  }, []);

  if (!ready && waking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        gap: '16px',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ fontSize: '2rem' }}>⚙️</div>
        <p style={{ fontSize: '1.1rem', margin: 0 }}>Connecting to server…</p>
        <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>
          This only happens on the first visit. Usually takes 10–20 seconds.
        </p>
      </div>
    );
  }

  if (!ready) return null;

  return children;
}