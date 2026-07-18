import { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// A cold Render instance can take ~30s to boot, so keep retrying rather than
// giving up after one attempt and dropping the user on a broken app.
const RETRY_DELAY_MS = 3000;
const MAX_WAIT_MS = 45000;

export default function ServerWakeUp({ children }) {
  const [ready, setReady] = useState(false);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Only show the waking screen if the server is slow enough to notice;
    // a warm server answers well inside this and renders straight through.
    const wakingTimer = setTimeout(() => {
      if (!cancelled) setWaking(true);
    }, 2000);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const checkServer = async () => {
      const deadline = Date.now() + MAX_WAIT_MS;

      while (!cancelled) {
        try {
          await fetch(`${API_BASE}/health`);
          break;
        } catch (err) {
          // Past the deadline we fail open: render the app and let individual
          // requests surface their own errors rather than hanging forever.
          if (Date.now() >= deadline) break;
          await sleep(RETRY_DELAY_MS);
        }
      }

      if (cancelled) return;
      clearTimeout(wakingTimer);
      setReady(true);
    };

    checkServer();

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
    };
  }, []);

  if (!ready && waking) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '16px',
          boxSizing: 'border-box',
          textAlign: 'center',
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          gap: '16px',
          fontFamily: 'sans-serif'
        }}
      >
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
