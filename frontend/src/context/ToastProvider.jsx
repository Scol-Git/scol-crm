import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { ToastContext } from './toastContext';
import { colors } from '../theme';

const VARIANTS = {
  success: { color: colors.success, Icon: CheckCircle },
  error: { color: colors.error, Icon: AlertCircle },
  info: { color: colors.info, Icon: Info },
};

const DEFAULT_DURATION_MS = 6000;

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, variant = 'info', durationMs = DEFAULT_DURATION_MS) => {
    if (!message) return;
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
  }, [dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({
    show,
    success: (message) => show(message, 'success'),
    // Errors stay longer: they usually say what to do next.
    error: (message) => show(message, 'error', 10000),
    info: (message) => show(message, 'info'),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed', right: '20px', bottom: '20px', zIndex: 2000,
          display: 'flex', flexDirection: 'column', gap: '10px',
          width: 'min(380px, calc(100vw - 40px))', pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const { color, Icon } = VARIANTS[toast.variant] || VARIANTS.info;
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px', borderRadius: '10px',
                backgroundColor: colors.contentSurface,
                border: `1px solid ${colors.borderLight}`,
                borderLeft: `4px solid ${color}`,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                color: colors.textPrimary, fontSize: '14px', lineHeight: 1.45,
                pointerEvents: 'auto',
              }}
            >
              <Icon size={18} style={{ color, flexShrink: 0, marginTop: '1px' }} />
              <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{toast.message}</div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: colors.textSecondary, padding: '2px', lineHeight: 0, flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
