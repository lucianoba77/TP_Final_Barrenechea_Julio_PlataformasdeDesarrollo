/**
 * Servicio para gestionar asistentes en el backend
 */

import { db } from '../config/firebase-admin.js';

const COLECCION_ASISTENTES = 'asistentes';
const COLECCION_USUARIOS = 'usuarios';

/**
 * Verifica si un email corresponde a un asistente
 * @param {string} emailAsistente - Email del asistente
 * @param {string} ignorarPacienteId - ID de paciente a ignorar (opcional)
 * @returns {Promise<Object>} Resultado con información del asistente y paciente
 */
export const esAsistenteDe = async (emailAsistente, ignorarPacienteId = null) => {
  try {
    const asistentesRef = db.collection(COLECCION_ASISTENTES);
    const querySnapshot = await asistentesRef
      .where('emailAsistente', '==', emailAsistente)
      .where('activo', '==', true)
      .get();

    if (!querySnapshot.empty) {
      for (const asistenteDoc of querySnapshot.docs) {
        const asistenteData = asistenteDoc.data();

        if (!asistenteData.pacienteId) {
          continue;
        }

        if (ignorarPacienteId && asistenteData.pacienteId === ignorarPacienteId) {
          continue;
        }

        // Obtener datos del paciente
        const pacienteDoc = await db.collection(COLECCION_USUARIOS).doc(asistenteData.pacienteId).get();

        if (pacienteDoc.exists) {
          return {
            success: true,
            esAsistente: true,
            pacienteId: asistenteData.pacienteId,
            paciente: {
              id: pacienteDoc.id,
              ...pacienteDoc.data(),
            },
            asistente: {
              id: asistenteDoc.id,
              ...asistenteData,
            },
          };
        }
      }
    }

    return {
      success: true,
      esAsistente: false,
    };
  } catch (error) {
    console.error('Error al verificar asistente:', error);
    return {
      success: false,
      esAsistente: false,
      error: error.message,
    };
  }
};

/**
 * Obtiene todos los asistentes de un paciente
 * @param {string} pacienteId - ID del paciente
 * @returns {Promise<Object>} Lista de asistentes
 */
export const obtenerAsistentesDePaciente = async (pacienteId) => {
  try {
    const asistentesRef = db.collection(COLECCION_ASISTENTES);
    const querySnapshot = await asistentesRef
      .where('pacienteId', '==', pacienteId)
      .where('activo', '==', true)
      .get();

    const asistentes = [];
    querySnapshot.forEach((doc) => {
      asistentes.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      asistentes,
    };
  } catch (error) {
    console.error('Error al obtener asistentes:', error);
    return {
      success: false,
      error: error.message,
      asistentes: [],
    };
  }
};

