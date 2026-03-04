/**
 * Middleware centralizado para manejo de errores
 */

/**
 * Middleware para manejar errores de forma centralizada
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: err.message,
    });
  }

  // Error de Firebase
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      success: false,
      error: 'Error de autenticación',
      details: err.message,
    });
  }

  // Error de Firestore
  if (err.code && err.code.startsWith('permission-denied')) {
    return res.status(403).json({
      success: false,
      error: 'Permisos insuficientes',
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
  });
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
  });
};

