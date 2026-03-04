/**
 * Utilidades para manejar la autenticación con Google Calendar
 * Usa flujo con código (response_type=code): el backend intercambia el código por tokens
 * y guarda refresh_token para renovar el acceso sin que el usuario tenga que reconectar.
 */

/**
 * Redirige a Google para autorizar acceso a Google Calendar.
 * Google redirigirá de vuelta con ?code=...; el callback envía el code al backend.
 */
export const autorizarGoogleCalendar = (clientId) => {
  const redirectUri = window.location.origin + '/auth/google/callback';
  const scope = 'https://www.googleapis.com/auth/calendar.events';
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=${responseType}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=${accessType}&` +
    `prompt=${prompt}&` +
    `include_granted_scopes=true`;

  window.location.href = authUrl;
};

/**
 * Obtiene el código de autorización de la URL (?code=...) tras el redirect de Google
 */
export const obtenerCodigoDeURL = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('code') || null;
};

/**
 * Obtiene el access_token de la URL después de la redirección OAuth (flujo implícito, legacy)
 */
export const obtenerTokenDeURL = () => {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const tokenType = params.get('token_type');

  if (accessToken) {
    return {
      access_token: accessToken,
      expires_in: parseInt(expiresIn) || 3600,
      token_type: tokenType || 'Bearer',
      fechaObtencion: new Date().toISOString()
    };
  }

  return null;
};

/**
 * Verifica si el token está expirado
 */
export const esTokenExpirado = (tokenData) => {
  if (!tokenData || !tokenData.fechaObtencion || !tokenData.expires_in) {
    return true;
  }

  const fechaObtencion = new Date(tokenData.fechaObtencion);
  const fechaExpiracion = new Date(fechaObtencion.getTime() + (tokenData.expires_in * 1000));
  const ahora = new Date();

  return ahora >= fechaExpiracion;
};

/**
 * Renueva el token si es necesario (requiere backend en producción)
 */
export const renovarToken = async (refreshToken) => {
  // Esta función debe implementarse en el backend
  // por seguridad (requiere Client Secret)
  throw new Error('Renovación de token debe hacerse en el backend');
};

