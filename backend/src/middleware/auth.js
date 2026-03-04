/**
 * Middleware de autenticación JWT
 * Verifica que el token JWT sea válido y agrega el usuario al request
 */

import { verificarToken } from '../services/jwtService.js';

/**
 * Middleware para verificar autenticación JWT
 */
export const autenticar = (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación no proporcionado',
      });
    }

    // Extraer el token
    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar el token
    const decoded = verificarToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado',
      });
    }

    // Agregar información del usuario al request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Error al verificar token',
    });
  }
};

