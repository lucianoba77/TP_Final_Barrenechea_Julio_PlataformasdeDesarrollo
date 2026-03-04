import React, { createContext, useState, useContext, useCallback } from 'react';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const NotificationContext = createContext();
const TOAST_ICON_PREFIX_REGEX = /^[\s]*(✅|❌|⚠️|⚠|ℹ️|ℹ)[\s]*/;

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: null,
    onCancel: null,
    type: 'warning'
  });

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const normalizedMessage = String(message ?? '').replace(TOAST_ICON_PREFIX_REGEX, '').trim();
    const id = Date.now() + Math.random();
    const newToast = { id, message: normalizedMessage, type, duration };
    
    setToasts(prev => {
      const existeToastIgualActivo = prev.some(
        toast => toast.message === normalizedMessage && toast.type === type
      );

      if (existeToastIgualActivo) {
        return prev;
      }

      return [...prev, newToast];
    });
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration = 3000) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration = 4000) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration = 3000) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration = 3000) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const showConfirm = useCallback(({
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    onConfirm,
    onCancel
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          if (onCancel) onCancel();
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <NotificationContext.Provider value={{
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      showConfirm,
      removeToast
    }}>
      {children}
      
      {/* Renderizar toasts */}
      <div className="app-toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Renderizar diálogo de confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe ser usado dentro de NotificationProvider');
  }
  return context;
};

