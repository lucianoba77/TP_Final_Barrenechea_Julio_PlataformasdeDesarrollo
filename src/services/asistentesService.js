import api from './apiService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const agregarAsistente = async (pacienteId, emailAsistente, nombreAsistente, password, credencialesPaciente = null) => {
  try {
    if (!pacienteId) {
      return {
        success: false,
        error: 'Paciente no identificado. Vuelve a iniciar sesión e intenta nuevamente.'
      };
    }

    const response = await api.post('/asistentes', {
      emailAsistente,
      nombreAsistente,
      password
    });

    return response;
  } catch (error) {
    console.error('Error al agregar asistente:', error);
    return {
      success: false,
      error: error.message || 'Error al agregar asistente'
    };
  }
};

export const obtenerAsistentes = async (pacienteId) => {
  try {
    if (!pacienteId) {
      return {
        success: false,
        error: 'Paciente no identificado',
        asistentes: []
      };
    }

    const response = await api.get('/asistentes');
    return response;
  } catch (error) {
    console.error('Error al obtener asistentes:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener asistentes',
      asistentes: []
    };
  }
};

export const eliminarAsistente = async (asistenteId) => {
  try {
    const response = await api.delete(`/asistentes/${asistenteId}`);
    return response;
  } catch (error) {
    console.error('Error al eliminar asistente:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar asistente'
    };
  }
};

export const eliminarTodosLosAsistentes = async (pacienteId) => {
  try {
    if (!pacienteId) {
      return {
        success: false,
        error: 'Paciente no identificado'
      };
    }

    // Obtener todos los asistentes y eliminarlos uno por uno
    const asistentesResponse = await obtenerAsistentes(pacienteId);
    
    if (!asistentesResponse.success) {
      return asistentesResponse;
    }

    const eliminaciones = [];
    for (const asistente of asistentesResponse.asistentes) {
      const resultado = await eliminarAsistente(asistente.id);
      if (resultado.success) {
        eliminaciones.push(asistente.id);
      }
    }

    return {
      success: true,
      eliminados: eliminaciones.length
    };
  } catch (error) {
    console.error('Error al eliminar todos los asistentes:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const esAsistenteDe = async (emailAsistente, opciones = {}) => {
  try {
    if (!db) {
      throw new Error('Firestore no está disponible');
    }

    const { ignorarPacienteId } = opciones;

    try {
      const response = await api.get(`/asistentes/verificar/${encodeURIComponent(emailAsistente)}`);
      if (response.success) {
        return response;
      }
    } catch (apiError) {
      console.warn('No se pudo usar la API, usando Firestore directamente:', apiError);
    }
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const asistentesRef = collection(db, 'asistentes');
    const q = query(
      asistentesRef,
      where('emailAsistente', '==', emailAsistente),
      where('activo', '==', true)
    );

    const querySnapshot = await getDocs(q);
    
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
        const pacienteDoc = await getDoc(doc(db, 'usuarios', asistenteData.pacienteId));
        
        if (pacienteDoc.exists()) {
          return {
            success: true,
            esAsistente: true,
            pacienteId: asistenteData.pacienteId,
            paciente: {
              id: pacienteDoc.id,
              ...pacienteDoc.data()
            },
            asistente: {
              id: asistenteDoc.id,
              ...asistenteData
            }
          };
        }
      }
    }

    return {
      success: true,
      esAsistente: false
    };
  } catch (error) {
    console.error('Error al verificar asistente:', error);
    return {
      success: false,
      esAsistente: false,
      error: error.message
    };
  }
};

export const obtenerPacienteDeAsistente = async (emailAsistente) => {
  try {
    const resultado = await esAsistenteDe(emailAsistente);
    
    if (resultado.success && resultado.esAsistente) {
      return {
        success: true,
        paciente: resultado.paciente,
        pacienteId: resultado.pacienteId
      };
    }

    return {
      success: false,
      error: 'No se encontró paciente asociado'
    };
  } catch (error) {
    console.error('Error al obtener paciente de asistente:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
