import { useEffect, useState } from 'react';

// Chrome fires beforeinstallprompt when the app is installable, then suppresses
// its own banner if we preventDefault. Holding the event lets us show an install
// button at a moment that makes sense instead of whenever Chrome decides.
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Chrome never fires beforeinstallprompt again once installed, so this
    // also clears the banner if the user installs from the browser menu.
    const installed = () => setDeferredPrompt(null);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // The event can only be used once, whatever the user chose.
    setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      backgroundColor: '#1e293b',
      color: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      zIndex: 9998,
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <span style={{ fontSize: '14px' }}>Install Inventory Manager Pro for quick access</span>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={install}
          style={{ padding: '8px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ padding: '8px 10px', backgroundColor: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '13px' }}
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;