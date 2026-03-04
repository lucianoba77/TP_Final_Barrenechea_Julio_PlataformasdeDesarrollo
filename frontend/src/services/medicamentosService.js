import api, { hasToken } from './apiService';
export const obtenerMedicamentos = async (userId) => {
  try {
    const response = await api.get('/medicamentos');
    return response;
  } catch (error) {
    console.error('Error al obtener medicamentos:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener medicamentos',
      medicamentos: []
    };
  }
};

export const obtenerMedicamento = async (medicamentoId) => {
  try {
    const response = await api.get(`/medicamentos/${medicamentoId}`);
    return response;
  } catch (error) {
    console.error('Error al obtener medicamento:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener medicamento'
    };
  }
};

export const agregarMedicamento = async (userId, medicamentoData) => {
  try {
    const response = await api.post('/medicamentos', medicamentoData);
    return response;
  } catch (error) {
    console.error('Error al agregar medicamento:', error);
    return {
      success: false,
      error: error.message || 'Error al agregar medicamento'
    };
  }
};

export const actualizarMedicamento = async (medicamentoId, datosActualizados) => {
  try {
    const response = await api.put(`/medicamentos/${medicamentoId}`, datosActualizados);
    return response;
  } catch (error) {
    console.error('Error al actualizar medicamento:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar medicamento'
    };
  }
};

export const eliminarMedicamento = async (medicamentoId) => {
  try {
    const response = await api.delete(`/medicamentos/${medicamentoId}`);
    return response;
  } catch (error) {
    console.error('Error al eliminar medicamento:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar medicamento'
    };
  }
};

export const marcarTomaRealizada = async (medicamentoId, hora) => {
  try {
    const response = await api.post(`/medicamentos/${medicamentoId}/marcar-toma`, { hora });
    return response;
  } catch (error) {
    console.error('Error al marcar toma:', error);
    return {
      success: false,
      error: error.message || 'Error al marcar toma'
    };
  }
};

export const restarStockMedicamento = async (medicamentoId) => {
  try {
    const response = await api.post(`/medicamentos/${medicamentoId}/restar-stock`);
    return response;
  } catch (error) {
    console.error('Error al restar stock:', error);
    return {
      success: false,
      error: error.message || 'Error al restar stock'
    };
  }
};

export const agregarStockOcasional = async (medicamentoId, cantidad, fechaVencimiento) => {
  try {
    const response = await api.post(`/medicamentos/${medicamentoId}/agregar-stock`, {
      cantidad,
      fechaVencimiento
    });
    return response;
  } catch (error) {
    console.error('Error al agregar stock:', error);
    return {
      success: false,
      error: error.message || 'Error al agregar stock'
    };
  }
};

export const eliminarTodosLosMedicamentos = async (userId) => {
  try {
    const medicamentosResponse = await obtenerMedicamentos(userId);
    
    if (!medicamentosResponse.success) {
      return medicamentosResponse;
    }

    const eliminaciones = [];
    for (const medicamento of medicamentosResponse.medicamentos) {
      const resultado = await eliminarMedicamento(medicamento.id);
      if (resultado.success) {
        eliminaciones.push(medicamento.id);
      }
    }

    return {
      success: true,
      eliminados: eliminaciones.length
    };
  } catch (error) {
    console.error('Error al eliminar todos los medicamentos:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const suscribirMedicamentos = (userId, callback) => {
    const intervalId = setInterval(async () => {
    if (!hasToken()) {
      return;
    }

    try {
      const response = await obtenerMedicamentos(userId);
      if (response.success) {
        callback(response.medicamentos || []);
      } else if (response.error && !response.error.includes('Sesión expirada')) {
        callback([]);
      }
    } catch (error) {
      if (error.message && !error.message.includes('Sesión expirada')) {
        console.error('Error en suscripción de medicamentos:', error);
        callback([]);
      }
    }
  }, 30000);
  return () => {
    clearInterval(intervalId);
  };
};
