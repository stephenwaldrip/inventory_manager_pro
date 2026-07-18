import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const toastStyles = {
  success: { bg: '#22c55e', icon: '✓' },
  error:   { bg: '#ef4444', icon: '✕' },
  info:    { bg: '#3b82f6', icon: 'ℹ' },
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="false"
    style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 9999,
    }}
  >
    {toasts.map((t) => {
      const style = toastStyles[t.type] || toastStyles.info;
      return (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '280px',
            maxWidth: '360px',
            padding: '12px 16px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderLeft: `4px solid ${style.bg}`,
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1e293b',
          }}
        >
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: style.bg,
            color: 'white',
            fontSize: '13px',
            fontWeight: '700',
            flexShrink: 0,
          }}>
            {style.icon}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      );
    })}
  </div>
);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};