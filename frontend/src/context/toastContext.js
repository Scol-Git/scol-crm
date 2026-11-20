import { createContext, useContext } from 'react';

// Kept apart from ToastProvider.jsx so that file only exports a component
// (keeps React fast refresh working).
export const ToastContext = createContext(null);

// const toast = useToast(); toast.success('Saved'); toast.error('Failed');
// Toasts survive navigation, unlike a page's inline <Alert>, so use them for
// the result of an action that leaves the page (delete, publish, discard).
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
