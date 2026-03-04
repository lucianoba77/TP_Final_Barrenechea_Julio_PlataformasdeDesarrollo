import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`app-toast app-toast-${type}`} onClick={onClose}>
      <div className="app-toast-content">
        <span className="app-toast-icon">{getIcon()}</span>
        <span className="app-toast-message">{message}</span>
      </div>
      <button className="app-toast-close" onClick={onClose}>×</button>
    </div>
  );
};

export default Toast;

