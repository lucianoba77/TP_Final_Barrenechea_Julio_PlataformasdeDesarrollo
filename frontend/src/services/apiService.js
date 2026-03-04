const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const getToken = () => {
  return localStorage.getItem('jwt_token');
};

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  // Asegurar que el endpoint comience con "/"
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const url = `${API_URL}${normalizedEndpoint}`;
    const response = await fetch(url, config);
    
    // Verificar si la respuesta es JSON antes de parsear
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Si no es JSON, intentar leer como texto
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text || 'Error desconocido' };
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        // No borrar token ni redirigir en verificación de asistente (puede fallar por carrera con el login; el servicio usa fallback a Firestore)
        const esVerificarAsistente = normalizedEndpoint.startsWith('/asistentes/verificar');
        if (!esVerificarAsistente) {
          localStorage.removeItem('jwt_token');
          const currentPath = window.location.pathname;
          const isAuthRoute = currentPath === '/login' || 
                             currentPath === '/auth/google/callback' || 
                             currentPath === '/' ||
                             currentPath === '/ajustes'; // No sacar de Ajustes: evita redirect 401 → login → dashboard tras conectar Calendar
          const isInitialAuth = endpoint === '/auth/login';
          if (!isAuthRoute && !isInitialAuth) {
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
        }
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      throw new Error(data.error || `Error en la petición (${response.status})`);
    }

    return data;
  } catch (error) {
    // Si es un error de red (fetch falló completamente)
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      console.error('Error de conexión con el backend:', error);
      const errorMessage = `No se pudo conectar con el servidor. Verifica que el backend esté corriendo en ${API_URL.replace('/api', '')}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Si el error ya tiene un mensaje, lanzarlo tal cual
    if (error.message) {
      if (error.message !== 'Sesión expirada. Por favor, inicia sesión nuevamente.') {
        console.error('Error en petición API:', error);
      }
      throw error;
    }
    
    // Error desconocido
    console.error('Error desconocido en petición API:', error);
    throw new Error('Error desconocido al realizar la petición');
  }
};
export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  
  post: (endpoint, body) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  
  put: (endpoint, body) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  
  delete: (endpoint, body) => apiRequest(endpoint, {
    method: 'DELETE',
    ...(body && { body: JSON.stringify(body) }),
  }),
};

export const setToken = (token) => {
  localStorage.setItem('jwt_token', token);
};

export const removeToken = () => {
  localStorage.removeItem('jwt_token');
};
export const hasToken = () => {
  return !!getToken();
};

export default api;

