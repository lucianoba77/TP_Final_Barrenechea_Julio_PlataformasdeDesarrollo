/**
 * Servicio para gestionar medicamentos en el backend
 */

import { db } from '../config/firebase-admin.js';

const COLECCION_MEDICAMENTOS = 'medicamentos';
const REGEX_HORA = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const normalizarHorariosTomas = (horariosTomas = []) => {
  if (!Array.isArray(horariosTomas)) return [];

  return [...new Set(
    horariosTomas
      .map((horario) => String(horario || '').trim())
      .filter((horario) => REGEX_HORA.test(horario))
  )].sort((a, b) => a.localeCompare(b));
};

const normalizarStockMedicamento = (medicamento) => {
  const stockInicial = Number(medicamento?.stockInicial) || 0;
  const stockActualGuardado = Number(medicamento?.stockActual);
  const stockActualValido = Number.isFinite(stockActualGuardado);

  if (stockActualValido) {
    return {
      ...medicamento,
      stockInicial,
      stockActual: Math.max(0, stockActualGuardado),
    };
  }

  // Compatibilidad con documentos viejos sin stockActual:
  // calcular restante según tomas ya marcadas.
  const tomasRealizadas = Array.isArray(medicamento?.tomasRealizadas)
    ? medicamento.tomasRealizadas
    : [];
  const tomasTomadas = tomasRealizadas.filter((toma) => toma?.tomada).length;
  const stockCalculado = Math.max(0, stockInicial - tomasTomadas);

  return {
    ...medicamento,
    stockInicial,
    stockActual: stockCalculado,
  };
};

/**
 * Obtiene todos los medicamentos de un usuario
 * @param {string} userId - ID del usuario (puede ser paciente o asistente)
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @returns {Promise<Object>} Lista de medicamentos
 */
export const obtenerMedicamentos = async (userId, pacienteId = null) => {
  try {
    // Si es asistente, usar pacienteId; si es paciente, usar userId
    const idParaBuscar = pacienteId || userId;

    const medicamentosRef = db.collection(COLECCION_MEDICAMENTOS);
    const querySnapshot = await medicamentosRef
      .where('userId', '==', idParaBuscar)
      .get();

    const medicamentos = [];
    querySnapshot.forEach((doc) => {
      const data = normalizarStockMedicamento(doc.data());
      medicamentos.push({
        id: doc.id,
        ...data,
      });
    });

    // Ordenar manualmente por primeraToma
    medicamentos.sort((a, b) => {
      const horaA = a.primeraToma || '00:00';
      const horaB = b.primeraToma || '00:00';
      return horaA.localeCompare(horaB);
    });

    return {
      success: true,
      medicamentos,
    };
  } catch (error) {
    console.error('Error al obtener medicamentos:', error);
    return {
      success: false,
      error: error.message,
      medicamentos: [],
    };
  }
};

/**
 * Obtiene un medicamento por ID
 * @param {string} medicamentoId - ID del medicamento
 * @param {string} userId - ID del usuario
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @returns {Promise<Object>} Medicamento
 */
export const obtenerMedicamento = async (medicamentoId, userId, pacienteId = null) => {
  try {
    const medicamentoDoc = await db.collection(COLECCION_MEDICAMENTOS).doc(medicamentoId).get();

    if (!medicamentoDoc.exists) {
      return {
        success: false,
        error: 'Medicamento no encontrado',
      };
    }

    const medicamentoData = normalizarStockMedicamento(medicamentoDoc.data());
    const idParaVerificar = pacienteId || userId;

    // Verificar que el medicamento pertenezca al usuario
    if (medicamentoData.userId !== idParaVerificar) {
      return {
        success: false,
        error: 'No tienes permisos para acceder a este medicamento',
      };
    }

    return {
      success: true,
      medicamento: {
        id: medicamentoDoc.id,
        ...medicamentoData,
      },
    };
  } catch (error) {
    console.error('Error al obtener medicamento:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Crea un nuevo medicamento
 * @param {string} userId - ID del usuario
 * @param {Object} medicamentoData - Datos del medicamento
 * @returns {Promise<Object>} Medicamento creado
 */
export const crearMedicamento = async (userId, medicamentoData) => {
  try {
    // Validar datos requeridos
    if (!medicamentoData.nombre || !medicamentoData.presentacion) {
      return {
        success: false,
        error: 'Nombre y presentación son requeridos',
      };
    }

    // Asegurar que stockInicial y stockActual sean números
    const stockInicial = medicamentoData.stockInicial !== undefined && medicamentoData.stockInicial !== null
      ? Number(medicamentoData.stockInicial)
      : 0;
    const stockActual = isNaN(stockInicial) ? 0 : stockInicial;

    const tomasDiarias = Number(medicamentoData.tomasDiarias) || 1;
    const usarProgramacionPersonalizada = medicamentoData.usarProgramacionPersonalizada || false;
    const horariosTomasNormalizados = normalizarHorariosTomas(medicamentoData.horariosTomas);
    const primeraTomaNormalizada = REGEX_HORA.test(String(medicamentoData.primeraToma || ''))
      ? String(medicamentoData.primeraToma)
      : '08:00';
    const horariosTomas =
      !usarProgramacionPersonalizada && tomasDiarias > 0
        ? (horariosTomasNormalizados.length > 0 ? horariosTomasNormalizados : [primeraTomaNormalizada])
        : [];
    const primeraToma = horariosTomas[0] || primeraTomaNormalizada;

    const medicamentoCompleto = {
      nombre: medicamentoData.nombre,
      presentacion: medicamentoData.presentacion,
      tomasDiarias,
      primeraToma,
      afeccion: medicamentoData.afeccion || '',
      stockInicial: stockInicial,
      stockActual: stockActual,
      diasTratamiento: Number(medicamentoData.diasTratamiento) || 0,
      esCronico: medicamentoData.esCronico || false,
      detalles: medicamentoData.detalles || '',
      fechaVencimiento: medicamentoData.fechaVencimiento || '',
      color: medicamentoData.color || '',
      userId,
      tomasRealizadas: medicamentoData.tomasRealizadas || [],
      activo: medicamentoData.activo !== undefined ? medicamentoData.activo : true,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      eventoIdsGoogleCalendar: [],
      programacionPersonalizada: medicamentoData.programacionPersonalizada || null,
      usarProgramacionPersonalizada,
      horariosTomas,
    };

    const docRef = await db.collection(COLECCION_MEDICAMENTOS).add(medicamentoCompleto);

    return {
      success: true,
      medicamento: {
        id: docRef.id,
        ...medicamentoCompleto,
      },
    };
  } catch (error) {
    console.error('Error al crear medicamento:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Actualiza un medicamento existente
 * @param {string} medicamentoId - ID del medicamento
 * @param {string} userId - ID del usuario
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @param {Object} datosActualizados - Datos a actualizar
 * @returns {Promise<Object>} Resultado de la actualización
 */
export const actualizarMedicamento = async (medicamentoId, userId, pacienteId, datosActualizados) => {
  try {
    const medicamentoRef = db.collection(COLECCION_MEDICAMENTOS).doc(medicamentoId);
    const medicamentoDoc = await medicamentoRef.get();

    if (!medicamentoDoc.exists) {
      return {
        success: false,
        error: 'Medicamento no encontrado',
      };
    }

    const medicamentoActual = medicamentoDoc.data();
    const idParaVerificar = pacienteId || userId;

    // Verificar que el medicamento pertenezca al usuario
    if (medicamentoActual.userId !== idParaVerificar) {
      return {
        success: false,
        error: 'No tienes permisos para modificar este medicamento',
      };
    }

    // Asegurar que stockInicial y stockActual sean números si se están actualizando
    if (datosActualizados.stockInicial !== undefined) {
      datosActualizados.stockInicial = Number(datosActualizados.stockInicial) || 0;
      if (datosActualizados.stockActual === undefined) {
        datosActualizados.stockActual = datosActualizados.stockInicial;
      }
    }

    if (datosActualizados.stockActual !== undefined) {
      datosActualizados.stockActual = Number(datosActualizados.stockActual) || 0;
    }

    if (Object.prototype.hasOwnProperty.call(datosActualizados, 'horariosTomas')) {
      datosActualizados.horariosTomas = normalizarHorariosTomas(datosActualizados.horariosTomas);
      if (datosActualizados.horariosTomas.length > 0) {
        datosActualizados.primeraToma = datosActualizados.horariosTomas[0];
      }
    }

    // Si se está suspendiendo el medicamento (activo: false), eliminar eventos de Google Calendar
    if (datosActualizados.activo === false && medicamentoActual.activo !== false) {
      if (medicamentoActual.eventoIdsGoogleCalendar && medicamentoActual.eventoIdsGoogleCalendar.length > 0) {
        try {
          const { obtenerTokenGoogle, eliminarEvento } = await import('./calendarService.js');
          const tokenData = await obtenerTokenGoogle(medicamentoActual.userId);

          if (tokenData && tokenData.access_token) {
            // Eliminar todos los eventos asociados
            for (const eventoId of medicamentoActual.eventoIdsGoogleCalendar) {
              try {
                await eliminarEvento(tokenData.access_token, eventoId);
              } catch (error) {
                // Si falla eliminar un evento individual, continuar con los demás
                console.error(`Error al eliminar evento ${eventoId}:`, error);
              }
            }
            // Limpiar los IDs de eventos después de eliminarlos
            datosActualizados.eventoIdsGoogleCalendar = [];
          }
        } catch (calendarError) {
          // Si falla la eliminación de eventos, registrar pero continuar con la suspensión
          console.error('Error al eliminar eventos de Google Calendar:', calendarError);
        }
      }
    }

    // Actualizar fecha de actualización
    datosActualizados.fechaActualizacion = new Date().toISOString();

    await medicamentoRef.update(datosActualizados);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al actualizar medicamento:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Elimina un medicamento
 * @param {string} medicamentoId - ID del medicamento
 * @param {string} userId - ID del usuario
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @returns {Promise<Object>} Resultado de la eliminación
 */
export const eliminarMedicamento = async (medicamentoId, userId, pacienteId) => {
  try {
    const medicamentoRef = db.collection(COLECCION_MEDICAMENTOS).doc(medicamentoId);
    const medicamentoDoc = await medicamentoRef.get();

    if (!medicamentoDoc.exists) {
      return {
        success: false,
        error: 'Medicamento no encontrado',
      };
    }

    const medicamentoData = medicamentoDoc.data();
    const idParaVerificar = pacienteId || userId;

    // Verificar que el medicamento pertenezca al usuario
    if (medicamentoData.userId !== idParaVerificar) {
      return {
        success: false,
        error: 'No tienes permisos para eliminar este medicamento',
      };
    }

    // Eliminar primero el medicamento para responder rápido al frontend.
    const eventoIds = Array.isArray(medicamentoData.eventoIdsGoogleCalendar)
      ? medicamentoData.eventoIdsGoogleCalendar
      : [];
    const ownerUserId = medicamentoData.userId;
    await medicamentoRef.delete();

    // Limpiar eventos de Google Calendar en background (no bloquea la respuesta).
    if (eventoIds.length > 0) {
      void (async () => {
        try {
          const { obtenerTokenGoogle, eliminarEvento } = await import('./calendarService.js');
          const tokenData = await obtenerTokenGoogle(ownerUserId);

          if (tokenData && tokenData.access_token) {
            for (const eventoId of eventoIds) {
              try {
                await eliminarEvento(tokenData.access_token, eventoId);
              } catch (error) {
                console.error(`Error al eliminar evento ${eventoId}:`, error);
              }
            }
          }
        } catch (calendarError) {
          console.error('Error en limpieza asíncrona de eventos de Google Calendar:', calendarError);
        }
      })();
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al eliminar medicamento:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Marca una toma como realizada
 * @param {string} medicamentoId - ID del medicamento
 * @param {string} userId - ID del usuario
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @param {string} hora - Hora de la toma (HH:mm)
 * @returns {Promise<Object>} Resultado
 */
export const marcarTomaRealizada = async (medicamentoId, userId, pacienteId, hora) => {
  try {
    const medicamentoRef = db.collection(COLECCION_MEDICAMENTOS).doc(medicamentoId);
    const medicamentoDoc = await medicamentoRef.get();

    if (!medicamentoDoc.exists) {
      return {
        success: false,
        error: 'Medicamento no encontrado',
      };
    }

    const medicamento = medicamentoDoc.data();
    const idParaVerificar = pacienteId || userId;

    // Verificar que el medicamento pertenezca al usuario
    if (medicamento.userId !== idParaVerificar) {
      return {
        success: false,
        error: 'No tienes permisos para modificar este medicamento',
      };
    }

    const fecha = new Date().toISOString().split('T')[0];
    const stockActualActual = medicamento.stockActual !== undefined && medicamento.stockActual !== null
      ? Number(medicamento.stockActual)
      : (medicamento.stockInicial !== undefined ? Number(medicamento.stockInicial) : 0);

    // Verificar si hay stock disponible
    if (stockActualActual <= 0) {
      return {
        success: false,
        error: 'No hay stock disponible para marcar esta toma',
      };
    }

    const nuevaToma = {
      fecha,
      hora,
      tomada: true,
      timestamp: new Date().toISOString(),
    };

    const tomasActualizadas = [...(medicamento.tomasRealizadas || []), nuevaToma];
    const nuevoStockActual = Math.max(0, stockActualActual - 1);

    await medicamentoRef.update({
      tomasRealizadas: tomasActualizadas,
      stockActual: nuevoStockActual,
      fechaActualizacion: new Date().toISOString(),
    });

    return {
      success: true,
      toma: nuevaToma,
      stockActual: nuevoStockActual,
    };
  } catch (error) {
    console.error('Error al marcar toma:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Resta stock de un medicamento
 * @param {string} medicamentoId - ID del medicamento
 * @param {string} userId - ID del usuario
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @returns {Promise<Object>} Resultado
 */
export const restarStock = async (medicamentoId, userId, pacienteId) => {
  try {
    const medicamentoRef = db.collection(COLECCION_MEDICAMENTOS).doc(medicamentoId);
    const medicamentoDoc = await medicamentoRef.get();

    if (!medicamentoDoc.exists) {
      return {
        success: false,
        error: 'Medicamento no encontrado',
      };
    }

    const medicamentoData = medicamentoDoc.data();
    const idParaVerificar = pacienteId || userId;

    if (medicamentoData.userId !== idParaVerificar) {
      return {
        success: false,
        error: 'No tienes permisos para modificar este medicamento',
      };
    }

    const stockActual = Number(medicamentoData.stockActual) || 0;

    if (stockActual <= 0) {
      return {
        success: false,
        error: 'No hay stock disponible para restar',
      };
    }

    const nuevoStock = Math.max(0, stockActual - 1);

    // Si es medicamento ocasional (tomasDiarias === 0), registrar la toma
    const esOcasional = medicamentoData.tomasDiarias === 0;
    const datosActualizados = {
      stockActual: nuevoStock,
      fechaActualizacion: new Date().toISOString(),
    };

    if (esOcasional) {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const horaActual = new Date().toTimeString().split(' ')[0].substring(0, 5);

      const nuevaToma = {
        fecha: fechaHoy,
        hora: horaActual,
        tomada: true,
        tipo: 'ocasional',
      };

      const tomasActualizadas = [...(medicamentoData.tomasRealizadas || []), nuevaToma];
      datosActualizados.tomasRealizadas = tomasActualizadas;
    }

    await medicamentoRef.update(datosActualizados);

    return {
      success: true,
      stockActual: nuevoStock,
      tomaRegistrada: esOcasional,
    };
  } catch (error) {
    console.error('Error al restar stock:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Agrega stock a un medicamento ocasional
 * @param {string} medicamentoId - ID del medicamento
 * @param {string} userId - ID del usuario
 * @param {string} pacienteId - ID del paciente (si es asistente)
 * @param {number} cantidad - Cantidad a agregar
 * @param {string} fechaVencimiento - Fecha de vencimiento
 * @returns {Promise<Object>} Resultado
 */
export const agregarStock = async (medicamentoId, userId, pacienteId, cantidad, fechaVencimiento) => {
  try {
    if (!fechaVencimiento) {
      return {
        success: false,
        error: 'La fecha de vencimiento es requerida cuando se agrega stock',
      };
    }

    const medicamentoRef = db.collection(COLECCION_MEDICAMENTOS).doc(medicamentoId);
    const medicamentoDoc = await medicamentoRef.get();

    if (!medicamentoDoc.exists) {
      return {
        success: false,
        error: 'Medicamento no encontrado',
      };
    }

    const medicamentoData = medicamentoDoc.data();
    const idParaVerificar = pacienteId || userId;

    if (medicamentoData.userId !== idParaVerificar) {
      return {
        success: false,
        error: 'No tienes permisos para modificar este medicamento',
      };
    }

    const stockActual = Number(medicamentoData.stockActual) || 0;
    const stockInicial = Number(medicamentoData.stockInicial) || 0;
    const nuevoStock = stockActual + Number(cantidad);
    const nuevoStockInicial = stockInicial + Number(cantidad);

    await medicamentoRef.update({
      stockActual: nuevoStock,
      stockInicial: nuevoStockInicial,
      fechaVencimiento: fechaVencimiento,
      fechaActualizacion: new Date().toISOString(),
    });

    return {
      success: true,
      stockActual: nuevoStock,
      stockInicial: nuevoStockInicial,
    };
  } catch (error) {
    console.error('Error al agregar stock:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

