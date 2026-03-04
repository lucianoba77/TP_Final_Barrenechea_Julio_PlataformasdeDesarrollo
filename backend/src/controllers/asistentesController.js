/**
 * Controlador de asistentes
 */

import { auth, db } from '../config/firebase-admin.js';
import * as asistentesService from '../services/asistentesService.js';

const COLECCION_ASISTENTES = 'asistentes';
const COLECCION_USUARIOS = 'usuarios';

/**
 * Obtiene todos los asistentes del paciente autenticado
 */
export const obtenerAsistentes = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Solo los pacientes pueden ver sus asistentes
    if (req.user.role !== 'paciente') {
      return res.status(403).json({
        success: false,
        error: 'Solo los pacientes pueden ver sus asistentes',
      });
    }

    const resultado = await asistentesService.obtenerAsistentesDePaciente(userId);

    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo asistente
 */
export const crearAsistente = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emailAsistente, nombreAsistente, password } = req.body;

    // Solo los pacientes pueden crear asistentes
    if (req.user.role !== 'paciente') {
      return res.status(403).json({
        success: false,
        error: 'Solo los pacientes pueden crear asistentes',
      });
    }

    if (!emailAsistente || !nombreAsistente || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, nombre y contraseña son requeridos',
      });
    }

    // Verificar que el asistente no esté ya agregado
    const asistentesRef = db.collection(COLECCION_ASISTENTES);
    const querySnapshot = await asistentesRef
      .where('pacienteId', '==', userId)
      .where('emailAsistente', '==', emailAsistente)
      .get();

    if (!querySnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Este asistente ya está agregado',
      });
    }

    // Crear el documento en Firestore
    const asistenteData = {
      pacienteId: userId,
      emailAsistente,
      nombreAsistente,
      fechaAgregado: new Date().toISOString(),
      activo: true,
    };

    const docRef = await asistentesRef.add(asistenteData);

    // Crear el usuario del asistente en Firebase Auth
    try {
      const userRecord = await auth.createUser({
        email: emailAsistente,
        password: password,
        displayName: nombreAsistente,
      });

      // Crear el documento del asistente en Firestore con rol correcto
      const usuarioAsistenteData = {
        id: userRecord.uid,
        email: userRecord.email,
        nombre: nombreAsistente,
        role: 'asistente',
        pacienteId: userId,
        tipoSuscripcion: 'gratis',
        esPremium: false,
        fechaCreacion: new Date().toISOString(),
        ultimaSesion: new Date().toISOString(),
      };

      await db.collection(COLECCION_USUARIOS).doc(userRecord.uid).set(usuarioAsistenteData);

      res.status(201).json({
        success: true,
        asistente: {
          id: docRef.id,
          ...asistenteData,
        },
      });
    } catch (authError) {
      // Si falla la creación del usuario, eliminar el documento de asistente creado
      await docRef.delete();

      let mensajeError = 'Error al crear la cuenta del asistente';
      if (authError.code === 'auth/email-already-exists') {
        mensajeError = 'Este email ya está registrado. El asistente debe usar otro email o iniciar sesión con este.';
      } else if (authError.code === 'auth/invalid-email') {
        mensajeError = 'El email no es válido';
      } else if (authError.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es muy débil (mínimo 6 caracteres)';
      }

      return res.status(400).json({
        success: false,
        error: mensajeError,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un asistente
 */
export const eliminarAsistente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Solo los pacientes pueden eliminar asistentes
    if (req.user.role !== 'paciente') {
      return res.status(403).json({
        success: false,
        error: 'Solo los pacientes pueden eliminar asistentes',
      });
    }

    // Verificar que el asistente pertenezca al paciente
    const asistenteDoc = await db.collection(COLECCION_ASISTENTES).doc(id).get();

    if (!asistenteDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Asistente no encontrado',
      });
    }

    const asistenteData = asistenteDoc.data();

    if (asistenteData.pacienteId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este asistente',
      });
    }

    // Eliminar el documento de asistente
    await db.collection(COLECCION_ASISTENTES).doc(id).delete();

    // Opcional: eliminar también la cuenta del usuario asistente
    // (comentado por si se quiere mantener la cuenta)
    // const usuariosRef = db.collection(COLECCION_USUARIOS);
    // const usuariosQuery = await usuariosRef
    //   .where('email', '==', asistenteData.emailAsistente)
    //   .where('role', '==', 'asistente')
    //   .get();
    // 
    // for (const usuarioDoc of usuariosQuery.docs) {
    //   await auth.deleteUser(usuarioDoc.id);
    //   await usuarioDoc.ref.delete();
    // }

    res.json({
      success: true,
      message: 'Asistente eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica si un email corresponde a un asistente
 */
export const verificarAsistente = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido',
      });
    }

    const resultado = await asistentesService.esAsistenteDe(email);

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

