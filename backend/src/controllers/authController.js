/**
 * Controlador de autenticación
 */

import { auth, db } from '../config/firebase-admin.js';
import { generarToken } from '../services/jwtService.js';
import { esAsistenteDe } from '../services/asistentesService.js';

/**
 * Inicia sesión con token de Firebase Auth
 * El frontend se autentica con Firebase Auth y envía el token aquí
 */
export const login = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        error: 'Token de Firebase requerido',
      });
    }

    // Verificar el token de Firebase Auth
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(firebaseToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Token de Firebase inválido o expirado',
      });
    }

    const userId = decodedToken.uid;
    const email = decodedToken.email;

    // Obtener datos del usuario desde Firestore
    const usuarioDoc = await db.collection('usuarios').doc(userId).get();

    if (!usuarioDoc.exists) {
      // Si no existe el documento, verificar si es asistente
      const asistenteResult = await esAsistenteDe(email, userId);
      if (asistenteResult.success && asistenteResult.esAsistente) {
        // Crear documento de usuario para el asistente
        const nuevoUsuarioData = {
          id: userId,
          email: email,
          nombre: decodedToken.name || email.split('@')[0],
          role: 'asistente',
          pacienteId: asistenteResult.pacienteId,
          tipoSuscripcion: 'gratis',
          esPremium: false,
          fechaCreacion: new Date().toISOString(),
          ultimaSesion: new Date().toISOString(),
        };

        await db.collection('usuarios').doc(userId).set(nuevoUsuarioData);

        const tokenPayload = {
          id: userId,
          email: email,
          role: 'asistente',
          pacienteId: asistenteResult.pacienteId,
        };

        const token = generarToken(tokenPayload);

        return res.json({
          success: true,
          token,
          usuario: {
            ...nuevoUsuarioData,
            paciente: asistenteResult.paciente,
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado en la base de datos',
      });
    }

    const usuarioData = usuarioDoc.data();

    // Verificar si es asistente
    const asistenteResult = await esAsistenteDe(email, userId);
    let usuarioFinal = {
      id: userId,
      email: email,
      nombre: decodedToken.name || usuarioData.nombre,
      ...usuarioData,
    };

    // Si es asistente, agregar información del paciente
    if (asistenteResult.success && asistenteResult.esAsistente) {
      usuarioFinal.role = 'asistente';
      usuarioFinal.pacienteId = usuarioData.pacienteId || asistenteResult.pacienteId;
      usuarioFinal.paciente = asistenteResult.paciente;
    }

    // Actualizar última sesión
    await db.collection('usuarios').doc(userId).update({
      ultimaSesion: new Date().toISOString(),
    });

    // Generar token JWT
    const tokenPayload = {
      id: usuarioFinal.id,
      email: usuarioFinal.email,
      role: usuarioFinal.role || 'paciente',
      pacienteId: usuarioFinal.pacienteId || null,
    };

    const token = generarToken(tokenPayload);

    res.json({
      success: true,
      token,
      usuario: usuarioFinal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registra un nuevo usuario
 */
export const registro = async (req, res, next) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'Email, contraseña y nombre son requeridos',
      });
    }

    // Verificar si este email corresponde a un asistente
    const asistenteResult = await esAsistenteDe(email);

    // Crear usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: nombre,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({
          success: false,
          error: 'Este email ya está registrado',
        });
      }
      throw error;
    }

    // Determinar el rol
    let role = 'paciente';
    let pacienteId = null;
    let nombreFinal = nombre;

    if (asistenteResult.success && asistenteResult.esAsistente) {
      role = 'asistente';
      pacienteId = asistenteResult.pacienteId;
      if (asistenteResult.asistente && asistenteResult.asistente.nombreAsistente) {
        nombreFinal = asistenteResult.asistente.nombreAsistente;
        // Actualizar displayName en Firebase Auth
        await auth.updateUser(userRecord.uid, {
          displayName: nombreFinal,
        });
      }
    }

    // Crear documento de usuario en Firestore
    const usuarioData = {
      id: userRecord.uid,
      email: userRecord.email,
      nombre: nombreFinal,
      role,
      pacienteId,
      tipoSuscripcion: 'gratis',
      esPremium: false,
      fechaCreacion: new Date().toISOString(),
      ultimaSesion: new Date().toISOString(),
    };

    await db.collection('usuarios').doc(userRecord.uid).set(usuarioData);

    // Generar token JWT
    const tokenPayload = {
      id: usuarioData.id,
      email: usuarioData.email,
      role: usuarioData.role,
      pacienteId: usuarioData.pacienteId || null,
    };

    const token = generarToken(tokenPayload);

    res.status(201).json({
      success: true,
      token,
      usuario: usuarioData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cierra la sesión (solo actualiza última sesión, el token se invalida en el frontend)
 */
export const logout = async (req, res, next) => {
  try {
    // En una implementación más robusta, podrías invalidar el token aquí
    // Por ahora, solo retornamos éxito
    res.json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

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

