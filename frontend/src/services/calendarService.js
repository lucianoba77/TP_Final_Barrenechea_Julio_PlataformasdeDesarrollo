import api from './apiService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { esMedicamentoOcasional } from '../utils/medicamentoUtils';

/**
 * Conecta Google Calendar enviando el código de autorización (recomendado) o el token
 */
export const guardarTokenGoogle = async (userId, tokenDataOrCode) => {
  try {
    const body = tokenDataOrCode?.access_token
      ? { tokenData: tokenDataOrCode }
      : { code: tokenDataOrCode };
    const response = await api.post('/calendar/conectar', body);
    return response;
  } catch (error) {
    console.error('Error al guardar token:', error);
    return {
      success: false,
      error: error.message || 'Error al guardar token'
    };
  }
};

export const obtenerTokenGoogle = async (userId) => {
  try {
    if (!db) {
      return null;
    }

    const tokenDoc = await getDoc(doc(db, 'googleTokens', userId));
    
    if (tokenDoc.exists()) {
      const tokenData = tokenDoc.data();
      
      if (tokenData.fechaObtencion && tokenData.expires_in) {
        const fechaObtencion = new Date(tokenData.fechaObtencion);
        const fechaExpiracion = new Date(fechaObtencion.getTime() + (tokenData.expires_in * 1000));
        const ahora = new Date();
        
        if (ahora >= fechaExpiracion || (fechaExpiracion.getTime() - ahora.getTime()) < 5 * 60 * 1000) {
          await eliminarTokenGoogle(userId);
          return null;
        }
      }
      
      return tokenData;
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener token:', error);
    return null;
  }
};

export const eliminarTokenGoogle = async (userId) => {
  try {
    const response = await api.delete('/calendar/desconectar');
    return response;
  } catch (error) {
    console.error('Error al eliminar token:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar token'
    };
  }
};

export const verificarConexion = async (userId) => {
  try {
    const response = await api.get('/calendar/estado');
    return response;
  } catch (error) {
    console.error('Error al verificar conexión:', error);
    return {
      success: false,
      conectado: false,
      error: error.message
    };
  }
};

export const crearEventoToma = async (accessToken, medicamento, fecha, hora) => {
  try {
    const fechaCompleta = new Date(`${fecha}T${hora}:00`);
    const fechaFin = new Date(fechaCompleta);
    fechaFin.setMinutes(fechaFin.getMinutes() + 15);

    const evento = {
      summary: `💊 ${medicamento.nombre}`,
      description: `Toma de ${medicamento.nombre}\n` +
                   `Presentación: ${medicamento.presentacion}\n` +
                   `Condición: ${medicamento.afeccion || 'N/A'}\n` +
                   `Stock: ${medicamento.stockActual}/${medicamento.diasTratamiento || medicamento.stockInicial}`,
      start: {
        dateTime: fechaCompleta.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: fechaFin.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'popup', minutes: 5 }
        ]
      },
      colorId: obtenerColorId(medicamento.color),
      extendedProperties: {
        private: {
          medicamentoId: medicamento.id,
          tipo: 'toma_medicamento'
        }
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(evento)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al crear evento');
    }

    const eventoCreado = await response.json();
    return {
      success: true,
      eventoId: eventoCreado.id,
      evento: eventoCreado
    };
  } catch (error) {
    console.error('Error al crear evento en Google Calendar:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Actualiza un evento existente en Google Calendar
 */
export const actualizarEventoToma = async (accessToken, eventoId, medicamento, fecha, hora) => {
  try {
    const fechaCompleta = new Date(`${fecha}T${hora}:00`);
    const fechaFin = new Date(fechaCompleta);
    fechaFin.setMinutes(fechaFin.getMinutes() + 15);

    const evento = {
      summary: `💊 ${medicamento.nombre}`,
      description: `Toma de ${medicamento.nombre}\n` +
                   `Presentación: ${medicamento.presentacion}\n` +
                   `Condición: ${medicamento.afeccion || 'N/A'}\n` +
                   `Stock: ${medicamento.stockActual}/${medicamento.diasTratamiento || medicamento.stockInicial}`,
      start: {
        dateTime: fechaCompleta.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: fechaFin.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'popup', minutes: 5 }
        ]
      },
      colorId: obtenerColorId(medicamento.color)
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evento)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al actualizar evento');
    }

    const eventoActualizado = await response.json();
    return {
      success: true,
      evento: eventoActualizado
    };
  } catch (error) {
    console.error('Error al actualizar evento en Google Calendar:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Elimina un evento de Google Calendar
 */
export const eliminarEventoToma = async (accessToken, eventoId) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al eliminar evento');
    }

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar evento de Google Calendar:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Crea eventos recurrentes para todas las tomas de un medicamento
 * Para medicamentos crónicos, crea eventos para 90 días
 * Para medicamentos ocasionales, no crea eventos
 */
export const crearEventosRecurrentes = async (accessToken, medicamento) => {
  try {
    // No crear eventos para medicamentos ocasionales
    if (esMedicamentoOcasional(medicamento)) {
      return {
        success: true,
        eventosCreados: 0,
        eventoIds: []
      };
    }

    const eventos = [];
    const fechaHoy = new Date();
    
    // Determinar cuántos días de eventos crear
    let diasTratamiento;
    if (medicamento.esCronico) {
      diasTratamiento = 90;
    } else {
      diasTratamiento = medicamento.diasTratamiento || 30;
    }

    // Calcular todas las horas de toma
    const horasToma = Array.isArray(medicamento.horariosTomas) && medicamento.horariosTomas.length > 0
      ? [...medicamento.horariosTomas].sort((a, b) => a.localeCompare(b))
      : (() => {
          const [hora, minuto] = medicamento.primeraToma.split(':');
          const calculadas = [];
          for (let i = 0; i < medicamento.tomasDiarias; i++) {
            const intervalo = 24 / medicamento.tomasDiarias;
            const horas = (parseInt(hora) + (i * intervalo)) % 24;
            const minutos = i === 0 ? parseInt(minuto) : 0;
            calculadas.push(`${Math.floor(horas).toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`);
          }
          return calculadas;
        })();

    // Crear eventos para cada día del tratamiento
    // Limitar a 100 eventos por vez para evitar sobrecarga de la API
    const maxEventos = 100;
    let eventosCreados = 0;
    
    for (let dia = 0; dia < diasTratamiento && eventosCreados < maxEventos; dia++) {
      const fecha = new Date(fechaHoy);
      fecha.setDate(fecha.getDate() + dia);
      const fechaStr = fecha.toISOString().split('T')[0];

      for (const horaToma of horasToma) {
        if (eventosCreados >= maxEventos) break;
        
        const resultado = await crearEventoToma(accessToken, medicamento, fechaStr, horaToma);
        if (resultado.success) {
          eventos.push(resultado.eventoId);
          eventosCreados++;
        }
      }
    }

    return {
      success: true,
      eventosCreados: eventos.length,
      eventoIds: eventos
    };
  } catch (error) {
    console.error('Error al crear eventos recurrentes:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Convierte el color del medicamento a un colorId de Google Calendar
 */
const obtenerColorId = (colorHex) => {
  const colores = {
    '#FFFFFF': '1',
    '#FFB6C1': '11',
    '#ADD8E6': '9',
    '#F5F5DC': '5',
    '#E6E6FA': '3',
    '#90EE90': '10',
    '#FFFF00': '5',
    '#FFA500': '6',
    '#800080': '3',
    '#00BFFF': '9',
    '#00FF00': '10',
    '#FF0000': '11'
  };

  return colores[colorHex] || '1';
};

/**
 * Verifica si el usuario tiene Google Calendar conectado
 */
export const tieneGoogleCalendarConectado = async (userId) => {
  const resultado = await verificarConexion(userId);
  return resultado.success && resultado.conectado;
};
