import api from './apiService';

export const obtenerPerfilUsuario = async () => {
  try {
    const response = await api.get('/usuarios/perfil');
    return response;
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener perfil',
    };
  }
};

export const actualizarPerfilUsuario = async (datos) => {
  try {
    const response = await api.put('/usuarios/perfil', datos);
    return response;
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar perfil',
    };
  }
};

