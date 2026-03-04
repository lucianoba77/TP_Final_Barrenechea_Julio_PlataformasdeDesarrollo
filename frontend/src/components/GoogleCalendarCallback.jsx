import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { guardarTokenGoogle } from '../services/calendarService';
import { obtenerCodigoDeURL, obtenerTokenDeURL } from '../utils/googleAuthHelper';

/**
 * Callback de OAuth de Google Calendar.
 * Soporta flujo con código (?code=...) y flujo implícito (#access_token=...) como respaldo.
 * Usa window.location.replace para ir a Ajustes y evitar redirección al dashboard por el router.
 */
const GoogleCalendarCallback = () => {
  const { usuarioActual } = useAuth();
  const { showError } = useNotification();
  const yaProcesado = useRef(false);

  useEffect(() => {
    if (yaProcesado.current) return;

    const procesarCallback = async () => {
      try {
        let intentos = 0;
        const maxIntentos = 20;

        while (!usuarioActual && intentos < maxIntentos) {
          await new Promise(resolve => setTimeout(resolve, 500));
          intentos++;
        }

        if (!usuarioActual) {
          showError('Sesión no disponible. Por favor, inicia sesión nuevamente.');
          window.location.replace(window.location.origin + '/login');
          return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        const error = searchParams.get('error') || (window.location.hash && new URLSearchParams(window.location.hash.substring(1)).get('error'));
        if (error) {
          const errorDescription = searchParams.get('error_description') || 'Error desconocido';
          showError('No se pudo conectar con Google Calendar: ' + errorDescription);
          window.location.replace(window.location.origin + '/ajustes');
          return;
        }

        const code = obtenerCodigoDeURL();
        const tokenData = obtenerTokenDeURL();
        const payload = code || tokenData;
        if (!payload) {
          showError('No se recibió autorización de Google. Intenta nuevamente.');
          window.location.replace(window.location.origin + '/ajustes');
          return;
        }

        const userId = usuarioActual.id || usuarioActual.uid;
        if (!userId) {
          showError('Error al identificar el usuario. Por favor, inicia sesión nuevamente.');
          window.location.replace(window.location.origin + '/login');
          return;
        }

        yaProcesado.current = true;
        const resultado = await guardarTokenGoogle(userId, payload);

        if (resultado.success) {
          sessionStorage.setItem('calendar_connected_ok', '1');
          // Forzar navegación a Ajustes con location para evitar que el router redirija al dashboard
          window.location.replace(window.location.origin + '/ajustes');
          return;
        } else {
          throw new Error(resultado.error || 'Error al guardar token');
        }
      } catch (error) {
        console.error('Error en callback OAuth:', error);
        showError('Error al conectar Google Calendar: ' + error.message);
        window.location.replace(window.location.origin + '/ajustes');
      }
    };

    procesarCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '48px' }}>⏳</div>
      <p>Procesando conexión con Google Calendar...</p>
    </div>
  );
};

export default GoogleCalendarCallback;

