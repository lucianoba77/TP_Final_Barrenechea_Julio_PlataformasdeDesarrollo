/**
 * Controlador de Google Calendar
 */

import * as calendarService from '../services/calendarService.js';

/**
 * Guarda el token de Google Calendar.
 * Acepta body con tokenData (flujo implícito) o code (flujo con código; recomendado, permite refresh).
 */
export const conectar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tokenData, code } = req.body;

    let datosParaGuardar = tokenData;

    if (code) {
      try {
        datosParaGuardar = await calendarService.intercambiarCodigoPorTokens(code);
        if (!datosParaGuardar || !datosParaGuardar.access_token) {
          return res.status(400).json({
            success: false,
            error: 'No se pudo obtener el token de Google. Verifica GOOGLE_CALENDAR_CLIENT_SECRET y redirect URI.',
          });
        }
      } catch (exchangeError) {
        console.error('Error al intercambiar código por tokens:', exchangeError);
        return res.status(400).json({
          success: false,
          error: exchangeError.message || 'Error al conectar con Google Calendar. Verifica la configuración del backend.',
        });
      }
    } else if (!tokenData || !tokenData.access_token) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere tokenData.access_token o code (recomendado para renovación automática).',
      });
    }

    const resultado = await calendarService.guardarTokenGoogle(userId, datosParaGuardar);

    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    res.json({
      success: true,
      message: 'Google Calendar conectado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Desconecta Google Calendar
 */
export const desconectar = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const resultado = await calendarService.eliminarTokenGoogle(userId);

    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    res.json({
      success: true,
      message: 'Google Calendar desconectado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica el estado de conexión con Google Calendar
 */
export const verificarEstado = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const resultado = await calendarService.verificarConexion(userId);

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

