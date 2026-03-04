/**
 * Controlador de usuarios
 */

import { db } from '../config/firebase-admin.js';
import { esAsistenteDe } from '../services/asistentesService.js';

/**
 * Obtiene el perfil del usuario autenticado
 */
export const obtenerPerfil = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const usuarioDoc = await db.collection('usuarios').doc(userId).get();

    if (!usuarioDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    const usuarioData = usuarioDoc.data();

    // Si es asistente, agregar información del paciente
    if (usuarioData.role === 'asistente' && usuarioData.pacienteId) {
      const pacienteDoc = await db.collection('usuarios').doc(usuarioData.pacienteId).get();
      if (pacienteDoc.exists) {
        usuarioData.paciente = {
          id: pacienteDoc.id,
          ...pacienteDoc.data(),
        };
      }
    }

    res.json({
      success: true,
      usuario: {
        id: usuarioDoc.id,
        ...usuarioData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza el perfil del usuario autenticado
 */
export const actualizarPerfil = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      nombre,
      notificacionesActivas,
      tonoAlarma,
      repeticionesAlarma,
      diasAntesStock,
    } = req.body;

    const usuarioRef = db.collection('usuarios').doc(userId);
    const usuarioDoc = await usuarioRef.get();

    if (!usuarioDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    const payloadActualizacion = {
      fechaActualizacion: new Date().toISOString(),
    };

    if (typeof nombre === 'string' && nombre.trim()) {
      payloadActualizacion.nombre = nombre.trim();
    }
    if (typeof notificacionesActivas === 'boolean') {
      payloadActualizacion.notificacionesActivas = notificacionesActivas;
    }
    if (typeof tonoAlarma === 'string' && tonoAlarma.trim()) {
      payloadActualizacion.tonoAlarma = tonoAlarma.trim();
    }
    if (repeticionesAlarma !== undefined) {
      const repeticiones = Number(repeticionesAlarma);
      if (!Number.isFinite(repeticiones) || repeticiones < 1 || repeticiones > 10) {
        return res.status(400).json({
          success: false,
          error: 'repeticionesAlarma debe estar entre 1 y 10',
        });
      }
      payloadActualizacion.repeticionesAlarma = repeticiones;
    }
    if (diasAntesStock !== undefined) {
      const dias = Number(diasAntesStock);
      if (!Number.isFinite(dias) || dias < 1 || dias > 30) {
        return res.status(400).json({
          success: false,
          error: 'diasAntesStock debe estar entre 1 y 30',
        });
      }
      payloadActualizacion.diasAntesStock = dias;
    }

    if (Object.keys(payloadActualizacion).length === 1) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos válidos para actualizar',
      });
    }

    await usuarioRef.update(payloadActualizacion);

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina la cuenta del usuario autenticado
 */
export const eliminarCuenta = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        error: 'Token de Firebase requerido para confirmar la eliminación',
      });
    }

    // Verificar el token de Firebase para seguridad adicional
    const { auth } = await import('../config/firebase-admin.js');
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(firebaseToken);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Token no corresponde al usuario autenticado',
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Token de Firebase inválido',
      });
    }

    // Eliminar todos los medicamentos del usuario
    const medicamentosRef = db.collection('medicamentos');
    const medicamentosQuery = await medicamentosRef.where('userId', '==', userId).get();
    const batch = db.batch();
    
    medicamentosQuery.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Eliminar todos los asistentes del paciente
    const asistentesRef = db.collection('asistentes');
    const asistentesQuery = await asistentesRef.where('pacienteId', '==', userId).get();
    
    asistentesQuery.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Eliminar tokens de Google Calendar si existen
    const tokenRef = db.collection('googleTokens').doc(userId);
    const tokenDoc = await tokenRef.get();
    if (tokenDoc.exists) {
      batch.delete(tokenRef);
    }

    // Eliminar el documento del usuario
    const usuarioRef = db.collection('usuarios').doc(userId);
    batch.delete(usuarioRef);

    // Ejecutar todas las eliminaciones
    await batch.commit();

    // Eliminar el usuario de Firebase Auth
    await auth.deleteUser(userId);

    res.json({
      success: true,
      message: 'Cuenta eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

