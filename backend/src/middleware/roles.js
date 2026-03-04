/**
 * Middleware para validar roles de usuario
 */

/**
 * Middleware para verificar que el usuario tenga un rol específico
 * @param {string[]} rolesPermitidos - Array de roles permitidos
 */
export const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const userRole = req.user.role;

    if (!rolesPermitidos.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para realizar esta acción',
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea paciente
 */
export const esPaciente = verificarRol(['paciente']);

/**
 * Middleware para verificar que el usuario sea asistente
 */
export const esAsistente = verificarRol(['asistente']);

/**
 * Middleware para verificar que el usuario sea paciente o asistente
 */
export const esPacienteOAsistente = verificarRol(['paciente', 'asistente']);

