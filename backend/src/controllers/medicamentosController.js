/**
 * Controlador de medicamentos
 */

import * as medicamentosService from '../services/medicamentosService.js';

/**
 * Obtiene todos los medicamentos del usuario autenticado
 */
export const obtenerMedicamentos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    const resultado = await medicamentosService.obtenerMedicamentos(userId, pacienteId);

    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un medicamento por ID
 */
export const obtenerMedicamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    const resultado = await medicamentosService.obtenerMedicamento(id, userId, pacienteId);

    if (!resultado.success) {
      return res.status(resultado.error?.includes('permisos') ? 403 : 404).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo medicamento
 */
export const crearMedicamento = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (req.user.role === 'asistente') {
      return res.status(403).json({
        success: false,
        error: 'Los asistentes no pueden crear medicamentos',
      });
    }

    const resultado = await medicamentosService.crearMedicamento(userId, req.body);

    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    const medicamento = resultado.medicamento;
    // Responder de inmediato para evitar latencia en UI
    res.status(201).json({
      success: true,
      medicamento
    });

    const requiereSincronizacionCalendar = medicamento.activo && medicamento.tomasDiarias > 0 &&
      (medicamento.esCronico || medicamento.diasTratamiento > 0 || medicamento.usarProgramacionPersonalizada);

    if (!requiereSincronizacionCalendar) {
      return;
    }

    void (async () => {
      try {
        const { obtenerTokenGoogle, crearEventosRecurrentes } = await import('../services/calendarService.js');
        const tokenData = await obtenerTokenGoogle(userId);
        if (!tokenData || !tokenData.access_token) return;

        const eventosResult = await crearEventosRecurrentes(tokenData.access_token, medicamento);
        if (eventosResult.success) {
          await medicamentosService.actualizarMedicamento(
            medicamento.id,
            userId,
            null,
            { eventoIdsGoogleCalendar: eventosResult.eventoIds || [] }
          );
        }
      } catch (calendarError) {
        console.error('Error en sincronización asíncrona de Google Calendar (crear):', calendarError);
      }
    })();
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un medicamento existente
 */
export const actualizarMedicamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    if (req.user.role === 'asistente') {
      return res.status(403).json({
        success: false,
        error: 'Los asistentes no pueden modificar medicamentos',
      });
    }

    const medicamentoActual = await medicamentosService.obtenerMedicamento(id, userId, pacienteId);
    
    if (!medicamentoActual.success) {
      return res.status(medicamentoActual.error?.includes('permisos') ? 403 : 404).json(medicamentoActual);
    }

    const resultado = await medicamentosService.actualizarMedicamento(
      id,
      userId,
      pacienteId,
      req.body
    );

    if (!resultado.success) {
      return res.status(resultado.error?.includes('permisos') ? 403 : 404).json(resultado);
    }

    // Responder rápido al frontend; sincronización de Calendar en background.
    res.json(resultado);

    const camposQueAfectanCalendar = [
      'nombre',
      'activo',
      'tomasDiarias',
      'primeraToma',
      'diasTratamiento',
      'esCronico',
      'programacionPersonalizada',
      'usarProgramacionPersonalizada',
    ];
    const requiereSincronizacionCalendar = camposQueAfectanCalendar.some((campo) =>
      Object.prototype.hasOwnProperty.call(req.body, campo)
    );

    if (!requiereSincronizacionCalendar) {
      return;
    }

    void (async () => {
      try {
        const { obtenerTokenGoogle, eliminarEvento, crearEventosRecurrentes } = await import('../services/calendarService.js');
        const tokenData = await obtenerTokenGoogle(userId);
        if (!tokenData || !tokenData.access_token) return;

        // Eliminar eventos anteriores (si existían)
        const eventoIdsPrevios = medicamentoActual.medicamento.eventoIdsGoogleCalendar || [];
        for (const eventoId of eventoIdsPrevios) {
          try {
            await eliminarEvento(tokenData.access_token, eventoId);
          } catch (error) {
            console.error(`Error al eliminar evento ${eventoId}:`, error);
          }
        }

        const medicamentoActualizado = await medicamentosService.obtenerMedicamento(id, userId, pacienteId);
        if (!medicamentoActualizado.success) return;

        const med = medicamentoActualizado.medicamento;
        const debeCrearEventos = med.activo && med.tomasDiarias > 0 &&
          (med.esCronico || med.diasTratamiento > 0 || med.usarProgramacionPersonalizada);

        if (!debeCrearEventos) {
          await medicamentosService.actualizarMedicamento(id, userId, pacienteId, { eventoIdsGoogleCalendar: [] });
          return;
        }

        const eventosResult = await crearEventosRecurrentes(tokenData.access_token, med);
        if (eventosResult.success) {
          await medicamentosService.actualizarMedicamento(id, userId, pacienteId, {
            eventoIdsGoogleCalendar: eventosResult.eventoIds || [],
          });
        }
      } catch (calendarError) {
        console.error('Error en sincronización asíncrona de Google Calendar:', calendarError);
      }
    })();
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un medicamento
 */
export const eliminarMedicamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    // Los asistentes no pueden eliminar medicamentos
    if (req.user.role === 'asistente') {
      return res.status(403).json({
        success: false,
        error: 'Los asistentes no pueden eliminar medicamentos',
      });
    }

    const resultado = await medicamentosService.eliminarMedicamento(id, userId, pacienteId);

    if (!resultado.success) {
      return res.status(resultado.error?.includes('permisos') ? 403 : 404).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Marca una toma como realizada
 */
export const marcarToma = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hora } = req.body;
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    // Los asistentes no pueden marcar tomas
    if (req.user.role === 'asistente') {
      return res.status(403).json({
        success: false,
        error: 'Los asistentes no pueden marcar tomas',
      });
    }

    if (!hora) {
      return res.status(400).json({
        success: false,
        error: 'La hora es requerida',
      });
    }

    const resultado = await medicamentosService.marcarTomaRealizada(id, userId, pacienteId, hora);

    if (!resultado.success) {
      return res.status(resultado.error?.includes('permisos') ? 403 : 400).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Resta stock de un medicamento
 */
export const restarStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    // Los asistentes no pueden restar stock
    if (req.user.role === 'asistente') {
      return res.status(403).json({
        success: false,
        error: 'Los asistentes no pueden modificar el stock',
      });
    }

    const resultado = await medicamentosService.restarStock(id, userId, pacienteId);

    if (!resultado.success) {
      return res.status(resultado.error?.includes('permisos') ? 403 : 400).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Agrega stock a un medicamento ocasional
 */
export const agregarStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cantidad, fechaVencimiento } = req.body;
    const userId = req.user.id;
    const pacienteId = req.user.pacienteId || null;

    // Los asistentes no pueden agregar stock
    if (req.user.role === 'asistente') {
      return res.status(403).json({
        success: false,
        error: 'Los asistentes no pueden modificar el stock',
      });
    }

    if (!cantidad || !fechaVencimiento) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad y fecha de vencimiento son requeridos',
      });
    }

    const resultado = await medicamentosService.agregarStock(
      id,
      userId,
      pacienteId,
      cantidad,
      fechaVencimiento
    );

    if (!resultado.success) {
      return res.status(resultado.error?.includes('permisos') ? 403 : 400).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

