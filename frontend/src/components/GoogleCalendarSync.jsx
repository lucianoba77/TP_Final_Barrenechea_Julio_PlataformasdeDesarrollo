import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  eliminarTokenGoogle,
  tieneGoogleCalendarConectado
} from '../services/calendarService';
import { autorizarGoogleCalendar } from '../utils/googleAuthHelper';
import './GoogleCalendarSync.css';

const GoogleCalendarSync = () => {
  const { usuarioActual } = useAuth();
  const { showError, showWarning, showSuccess } = useNotification();
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    verificarConexion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual]);

  useEffect(() => {
    const handleFocus = () => {
      if (usuarioActual) {
        setTimeout(() => verificarConexion(), 1000);
      }
    };

    const handleLocationChange = () => {
      if (usuarioActual && window.location.pathname === '/ajustes') {
        setTimeout(() => verificarConexion(), 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handleLocationChange);
    
    if (window.location.pathname === '/ajustes' && usuarioActual) {
      setTimeout(() => verificarConexion(), 1000);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handleLocationChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual]);

  const verificarConexion = async () => {
    if (!usuarioActual) {
      setCargando(false);
      return;
    }

    try {
      const userId = usuarioActual.id || usuarioActual.uid;
      if (!userId) {
        setConectado(false);
        setCargando(false);
        return;
      }

      const tieneConexion = await tieneGoogleCalendarConectado(userId);
      setConectado(tieneConexion);
    } catch (error) {
      console.error('Error al verificar conexión:', error);
      setConectado(false);
    } finally {
      setCargando(false);
    }
  };

  const manejarConectar = () => {
    if (!usuarioActual) {
      showError('Debes estar autenticado para conectar Google Calendar');
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      showWarning('Google Client ID no configurado. Configura REACT_APP_GOOGLE_CLIENT_ID en .env');
      return;
    }

    try {
      autorizarGoogleCalendar(GOOGLE_CLIENT_ID);
    } catch (error) {
      console.error('Error al iniciar autorización:', error);
      showError('Error al conectar Google Calendar');
    }
  };

  const manejarDesconectar = async () => {
    if (!usuarioActual) return;

    try {
      const userId = usuarioActual.id || usuarioActual.uid;
      if (!userId) {
        showError('No se pudo identificar el usuario');
        return;
      }

      await eliminarTokenGoogle(userId);
      setConectado(false);
      showSuccess('Google Calendar desconectado correctamente');
    } catch (error) {
      console.error('Error al desconectar:', error);
      showError('Error al desconectar Google Calendar');
    }
  };

  if (cargando) {
    return (
      <div className="calendar-sync-loading">
        <p>Verificando conexión...</p>
      </div>
    );
  }

  return (
    <div className="calendar-sync-container">

      {conectado ? (
        <div className="calendar-sync-connected">
          <div className="status-badge connected">
            <span>✅</span>
            <span>Conectado</span>
          </div>
          <p className="sync-info">
            Tus tomas de medicamentos se sincronizarán automáticamente con Google Calendar.
            Los eventos se crearán con recordatorios 15 y 5 minutos antes de cada toma.
          </p>
          <button onClick={manejarDesconectar} className="btn-disconnect">
            Desconectar Google Calendar
          </button>
        </div>
      ) : (
        <div className="calendar-sync-disconnected">
          <div className="status-badge disconnected">
            <span>❌</span>
            <span>No conectado</span>
          </div>
          <p className="sync-info">
            Conecta tu cuenta de Google para sincronizar automáticamente tus tomas de medicamentos
            con Google Calendar. Recibirás recordatorios en tu calendario.
          </p>
          <button onClick={manejarConectar} className="btn-connect">
            📅 Conectar Google Calendar
          </button>
        </div>
      )}

      <div className="calendar-sync-features">
        <h4>Funcionalidades:</h4>
        <ul>
          <li>✅ Eventos automáticos para cada toma programada</li>
          <li>✅ Recordatorios 15 y 5 minutos antes</li>
          <li>✅ Sincronización en tiempo real</li>
          <li>✅ Actualización automática al cambiar horarios</li>
          <li>✅ Eliminación automática al eliminar medicamentos</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleCalendarSync;

