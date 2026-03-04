/**
 * Utilidades para manejar suscripciones y límites de la aplicación
 */

// Límite de medicamentos para usuarios gratuitos
export const LIMITE_MEDICAMENTOS_GRATIS = 5;

/**
 * Verifica si el usuario puede agregar más medicamentos
 * @param {number} cantidadActual - Cantidad actual de medicamentos
 * @param {string} tipoSuscripcion - Tipo de suscripción ('gratis' | 'premium')
 * @returns {boolean} - true si puede agregar, false si no
 */
export const puedeAgregarMedicamento = (cantidadActual, tipoSuscripcion = 'gratis') => {
  if (tipoSuscripcion === 'premium') {
    return true; // Premium tiene medicamentos ilimitados
  }
  
  return cantidadActual < LIMITE_MEDICAMENTOS_GRATIS;
};

/**
 * Obtiene el mensaje de límite alcanzado
 * @param {number} cantidadActual - Cantidad actual de medicamentos
 * @returns {string} - Mensaje informativo
 */
export const obtenerMensajeLimite = (cantidadActual) => {
  const medicamentosRestantes = LIMITE_MEDICAMENTOS_GRATIS - cantidadActual;
  
  if (medicamentosRestantes === 0) {
    return 'Has alcanzado el límite de medicamentos en la versión gratuita. Suscríbete a Premium para agregar más.';
  }
  
  return `Te quedan ${medicamentosRestantes} medicamento${medicamentosRestantes > 1 ? 's' : ''} disponible${medicamentosRestantes > 1 ? 's' : ''} en la versión gratuita.`;
};

/**
 * Verifica si el usuario tiene suscripción premium
 * @param {Object} usuario - Objeto usuario
 * @returns {boolean} - true si es premium, false si no
 */
export const esUsuarioPremium = (usuario) => {
  return usuario?.tipoSuscripcion === 'premium' || usuario?.esPremium === true;
};

