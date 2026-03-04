/**
 * Servicio para gestionar Google Calendar en el backend
 */

import { db } from '../config/firebase-admin.js';
import { google } from 'googleapis';

const COLECCION_TOKENS = 'googleTokens';

const getOAuth2Client = () => {
  const clientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GOOGLE_CALENDAR_REDIRECT_URI || '').trim();
  if (!clientId) throw new Error('Falta REACT_APP_GOOGLE_CLIENT_ID o GOOGLE_CLIENT_ID en backend/.env');
  if (!clientSecret) throw new Error('Falta GOOGLE_CALENDAR_CLIENT_SECRET en backend/.env');
  if (!redirectUri) throw new Error('Falta GOOGLE_CALENDAR_REDIRECT_URI en backend/.env');
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Intercambia un código de autorización OAuth por tokens (access_token + refresh_token)
 * Requiere GOOGLE_CALENDAR_CLIENT_SECRET y GOOGLE_CALENDAR_REDIRECT_URI en .env
 */
export const intercambiarCodigoPorTokens = async (code) => {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Configuración de Google Calendar incompleta (client_id, client_secret, redirect_uri)');
  }
  const { tokens } = await oauth2Client.getToken(code);
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    expires_in: tokens.expiry_date ? Math.round((tokens.expiry_date - Date.now()) / 1000) : 3600,
    token_type: tokens.token_type || 'Bearer',
  };
};

/**
 * Guarda el token de acceso de Google en Firestore
 */
export const guardarTokenGoogle = async (userId, tokenData) => {
  try {
    const tokenParaGuardar = {
      ...tokenData,
      fechaObtencion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      userId: userId,
    };

    await db.collection(COLECCION_TOKENS).doc(userId).set(tokenParaGuardar, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error al guardar token:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Renueva el access_token usando refresh_token (si existe)
 */
const renovarTokenSiExpirado = async (userId, tokenData) => {
  if (!tokenData.refresh_token) return null;
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;
  try {
    oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    const nuevoToken = {
      ...tokenData,
      access_token: credentials.access_token,
      expires_in: credentials.expiry_date ? Math.round((credentials.expiry_date - Date.now()) / 1000) : 3600,
      fechaObtencion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    };
    await db.collection(COLECCION_TOKENS).doc(userId).set(nuevoToken, { merge: true });
    return nuevoToken;
  } catch (error) {
    console.error('Error al renovar token de Google Calendar:', error);
    return null;
  }
};

/**
 * Obtiene el token de acceso de Google del usuario
 * Si está expirado y hay refresh_token, lo renueva
 */
export const obtenerTokenGoogle = async (userId) => {
  try {
    const tokenDoc = await db.collection(COLECCION_TOKENS).doc(userId).get();

    if (!tokenDoc.exists) {
      return null;
    }

    const tokenData = tokenDoc.data();
    const ahora = new Date();

    if (tokenData.fechaObtencion && tokenData.expires_in) {
      const fechaObtencion = new Date(tokenData.fechaObtencion);
      const fechaExpiracion = new Date(fechaObtencion.getTime() + (tokenData.expires_in * 1000));
      const margenSegundos = 5 * 60 * 1000;

      if (ahora >= fechaExpiracion || (fechaExpiracion.getTime() - ahora.getTime()) < margenSegundos) {
        const renovado = await renovarTokenSiExpirado(userId, tokenData);
        if (renovado) return renovado;
        await eliminarTokenGoogle(userId);
        return null;
      }
    }

    return tokenData;
  } catch (error) {
    console.error('Error al obtener token:', error);
    return null;
  }
};

/**
 * Elimina el token de acceso (desconecta Google Calendar)
 */
export const eliminarTokenGoogle = async (userId) => {
  try {
    await db.collection(COLECCION_TOKENS).doc(userId).delete();
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar token:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Verifica si Google Calendar está conectado
 */
export const verificarConexion = async (userId) => {
  try {
    const tokenData = await obtenerTokenGoogle(userId);
    return {
      success: true,
      conectado: !!tokenData,
    };
  } catch (error) {
    console.error('Error al verificar conexión:', error);
    return {
      success: false,
      conectado: false,
      error: error.message,
    };
  }
};

/**
 * Obtiene el color ID para Google Calendar según la presentación
 */
const obtenerColorId = (color) => {
  const colores = {
    'tableta': '1',
    'capsula': '2',
    'jarabe': '3',
    'gotas': '4',
    'inyeccion': '5',
    'pomada': '6',
    'parche': '7',
    'spray': '8',
  };
  return colores[color] || '1';
};

/**
 * Función auxiliar para hacer delay entre requests
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const REGEX_HORA = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const obtenerHorariosToma = (medicamento) => {
  const horariosPersonalizados = Array.isArray(medicamento?.horariosTomas)
    ? medicamento.horariosTomas
        .map((horario) => String(horario || '').trim())
        .filter((horario) => REGEX_HORA.test(horario))
    : [];

  if (horariosPersonalizados.length > 0) {
    return [...new Set(horariosPersonalizados)].sort((a, b) => a.localeCompare(b));
  }

  if (!medicamento?.primeraToma || !medicamento?.tomasDiarias) {
    return [];
  }

  const horarios = [];
  const [hora, minutos] = medicamento.primeraToma.split(':').map(Number);
  const intervalo = 24 / medicamento.tomasDiarias;

  for (let i = 0; i < medicamento.tomasDiarias; i++) {
    const horasToma = hora + (intervalo * i);
    const horaToma = Math.floor(horasToma) % 24;
    horarios.push(`${String(horaToma).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`);
  }

  return horarios;
};

/**
 * Crea eventos basados en programación personalizada
 * Optimizado para evitar rate limiting de Google Calendar API
 */
export const crearEventosProgramacionPersonalizada = async (accessToken, medicamento) => {
  try {
    if (!medicamento.programacionPersonalizada || Object.keys(medicamento.programacionPersonalizada).length === 0) {
      return {
        success: true,
        eventoIds: [],
      };
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const eventoIds = [];
    const fechaInicio = new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    // Reducir el número máximo de eventos para apps no verificadas
    // Google Calendar API tiene límites estrictos para apps no verificadas
    const maxEventos = 30; // Reducido de 100 a 30 para evitar rate limiting
    
    let fechaFin;
    if (medicamento.esCronico) {
      // Para medicamentos crónicos, crear eventos solo para las próximas 4 semanas
      fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 28);
    } else {
      fechaFin = new Date(fechaInicio);
      const diasTratamiento = medicamento.diasTratamiento || 0;
      // Limitar a máximo 30 días para evitar crear demasiados eventos
      fechaFin.setDate(fechaFin.getDate() + Math.min(diasTratamiento, 30));
    }

    let eventosCreados = 0;
    const fechaActual = new Date(fechaInicio);
    const timeZone = 'America/Argentina/Buenos_Aires';
    let erroresRateLimit = 0;
    const maxErroresRateLimit = 3;

    // Preparar todos los eventos primero
    const eventosParaCrear = [];

    while (fechaActual <= fechaFin && eventosParaCrear.length < maxEventos) {
      const diaSemana = fechaActual.getDay();

      if (medicamento.programacionPersonalizada[diaSemana]) {
        const horarios = medicamento.programacionPersonalizada[diaSemana];

        for (const horario of horarios) {
          if (eventosParaCrear.length >= maxEventos) break;

          const [hora, minutos] = horario.split(':').map(Number);
          const fechaEvento = new Date(fechaActual);
          fechaEvento.setHours(hora, minutos, 0, 0);
          const fechaFinEvento = new Date(fechaEvento);
          fechaFinEvento.setMinutes(fechaFinEvento.getMinutes() + 15);
          
          eventosParaCrear.push({
            summary: `💊 ${medicamento.nombre}`,
            description: `Toma de ${medicamento.nombre}\n` +
                         `Presentación: ${medicamento.presentacion}\n` +
                         `Condición: ${medicamento.afeccion || 'N/A'}\n` +
                         `Stock: ${medicamento.stockActual}/${medicamento.stockInicial}`,
            start: {
              dateTime: fechaEvento.toISOString(),
              timeZone: timeZone,
            },
            end: {
              dateTime: fechaFinEvento.toISOString(),
              timeZone: timeZone,
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 15 },
                { method: 'popup', minutes: 5 },
              ],
            },
            colorId: obtenerColorId(medicamento.presentacion || 'tableta'),
          });
        }
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Crear eventos con delay entre requests para evitar rate limiting
    for (let i = 0; i < eventosParaCrear.length; i++) {
      if (erroresRateLimit >= maxErroresRateLimit) {
        console.warn('Demasiados errores de rate limiting. Deteniendo creación de eventos.');
        break;
      }

      try {
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventosParaCrear[i],
        });

        eventoIds.push(response.data.id);
        eventosCreados++;

        // Delay de 200ms entre requests para evitar rate limiting
        // Google Calendar API permite ~100 requests por 100 segundos para apps no verificadas
        if (i < eventosParaCrear.length - 1) {
          await delay(200);
        }
      } catch (error) {
        console.error(`Error al crear evento ${i + 1}/${eventosParaCrear.length}:`, error.message);
        
        // Detectar errores de rate limiting
        if (error.code === 429 || error.message?.includes('rate') || error.message?.includes('quota')) {
          erroresRateLimit++;
          console.warn(`Rate limit detectado. Esperando 2 segundos antes de continuar...`);
          await delay(2000);
          
          // Reintentar una vez más
          try {
            const retryResponse = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: eventosParaCrear[i],
            });
            eventoIds.push(retryResponse.data.id);
            eventosCreados++;
            erroresRateLimit = 0; // Resetear contador si el retry funciona
          } catch (retryError) {
            console.error('Error en reintento:', retryError.message);
            if (erroresRateLimit >= maxErroresRateLimit) {
              break;
            }
          }
        } else {
          // Otro tipo de error, continuar con el siguiente evento
          console.error('Error no relacionado con rate limiting:', error.message);
        }
      }
    }

    if (eventosCreados === 0 && eventosParaCrear.length > 0) {
      return {
        success: false,
        error: 'No se pudieron crear eventos en Google Calendar. Verifica tu conexión y permisos.',
        eventoIds: [],
      };
    }

    return {
      success: true,
      eventoIds,
      eventosCreados,
      eventosTotal: eventosParaCrear.length,
      advertencia: eventosCreados < eventosParaCrear.length 
        ? `Se crearon ${eventosCreados} de ${eventosParaCrear.length} eventos debido a límites de la API.`
        : null,
    };
  } catch (error) {
    console.error('Error al crear eventos de programación personalizada:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear eventos',
      eventoIds: [],
    };
  }
};

/**
 * Crea eventos recurrentes en Google Calendar para un medicamento
 */
export const crearEventosRecurrentes = async (accessToken, medicamento) => {
  try {
    if (medicamento.usarProgramacionPersonalizada && medicamento.programacionPersonalizada) {
      return await crearEventosProgramacionPersonalizada(accessToken, medicamento);
    }

    if (medicamento.tomasDiarias === 0) {
      return {
        success: true,
        eventoIds: [],
      };
    }

    if (!medicamento.esCronico && (!medicamento.diasTratamiento || medicamento.diasTratamiento <= 0)) {
      return {
        success: true,
        eventoIds: [],
      };
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const eventoIds = [];
    const fechaInicio = new Date();
    fechaInicio.setHours(0, 0, 0, 0);
    
    let fechaFin;
    if (medicamento.esCronico) {
      fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 90);
    } else {
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + (medicamento.diasTratamiento || 0));
    }

    const horarios = obtenerHorariosToma(medicamento);
    if (horarios.length === 0) {
      return {
        success: true,
        eventoIds: [],
      };
    }

    // Reducir el número máximo de eventos para apps no verificadas
    const maxEventos = 30;
    
    // Limitar fechaFin para evitar crear demasiados eventos
    if (medicamento.esCronico) {
      fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 28); // 4 semanas en lugar de 90 días
    } else {
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + Math.min(medicamento.diasTratamiento || 0, 30));
    }

    const eventosParaCrear = [];
    const fechaActual = new Date(fechaInicio);
    const timeZone = 'America/Argentina/Buenos_Aires';

    // Preparar todos los eventos primero
    while (fechaActual <= fechaFin && eventosParaCrear.length < maxEventos) {
      for (const horaToma of horarios) {
        if (eventosParaCrear.length >= maxEventos) break;

        const [hora, minutos] = horaToma.split(':').map(Number);
        const fechaEvento = new Date(fechaActual);
        fechaEvento.setHours(hora, minutos, 0, 0);
        const fechaFinEvento = new Date(fechaEvento);
        fechaFinEvento.setMinutes(fechaFinEvento.getMinutes() + 15);
        
        eventosParaCrear.push({
          summary: `💊 ${medicamento.nombre}`,
          description: `Toma de ${medicamento.nombre}\n` +
                       `Presentación: ${medicamento.presentacion}\n` +
                       `Condición: ${medicamento.afeccion || 'N/A'}\n` +
                       `Stock: ${medicamento.stockActual}/${medicamento.stockInicial}`,
          start: {
            dateTime: fechaEvento.toISOString(),
            timeZone: timeZone,
          },
          end: {
            dateTime: fechaFinEvento.toISOString(),
            timeZone: timeZone,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 15 },
              { method: 'popup', minutes: 5 },
            ],
          },
          colorId: obtenerColorId(medicamento.presentacion || 'tableta'),
        });
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Crear eventos con delay entre requests
    let eventosCreados = 0;
    let erroresRateLimit = 0;
    const maxErroresRateLimit = 3;

    for (let i = 0; i < eventosParaCrear.length; i++) {
      if (erroresRateLimit >= maxErroresRateLimit) {
        console.warn('Demasiados errores de rate limiting. Deteniendo creación de eventos.');
        break;
      }

      try {
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventosParaCrear[i],
        });

        eventoIds.push(response.data.id);
        eventosCreados++;

        // Delay de 200ms entre requests
        if (i < eventosParaCrear.length - 1) {
          await delay(200);
        }
      } catch (error) {
        console.error(`Error al crear evento ${i + 1}/${eventosParaCrear.length}:`, error.message);
        
        // Detectar errores de rate limiting
        if (error.code === 429 || error.message?.includes('rate') || error.message?.includes('quota')) {
          erroresRateLimit++;
          console.warn(`Rate limit detectado. Esperando 2 segundos antes de continuar...`);
          await delay(2000);
          
          // Reintentar una vez más
          try {
            const retryResponse = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: eventosParaCrear[i],
            });
            eventoIds.push(retryResponse.data.id);
            eventosCreados++;
            erroresRateLimit = 0;
          } catch (retryError) {
            console.error('Error en reintento:', retryError.message);
            if (erroresRateLimit >= maxErroresRateLimit) {
              break;
            }
          }
        } else {
          console.error('Error no relacionado con rate limiting:', error.message);
        }
      }
    }

    if (eventosCreados === 0 && eventosParaCrear.length > 0) {
      return {
        success: false,
        error: 'No se pudieron crear eventos en Google Calendar. Verifica tu conexión y permisos.',
        eventoIds: [],
      };
    }

    return {
      success: true,
      eventoIds,
      eventosCreados,
      eventosTotal: eventosParaCrear.length,
      advertencia: eventosCreados < eventosParaCrear.length 
        ? `Se crearon ${eventosCreados} de ${eventosParaCrear.length} eventos debido a límites de la API.`
        : null,
    };
  } catch (error) {
    console.error('Error al crear eventos recurrentes:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear eventos',
      eventoIds: [],
    };
  }
};

/**
 * Elimina un evento de Google Calendar
 */
export const eliminarEvento = async (accessToken, eventoId) => {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventoId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

