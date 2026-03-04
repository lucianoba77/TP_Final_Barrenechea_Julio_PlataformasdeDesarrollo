/**
 * Servicio para generar y verificar tokens JWT
 */

import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/jwt.js';

/**
 * Genera un token JWT para un usuario
 * @param {Object} payload - Datos del usuario (id, email, role, pacienteId)
 * @returns {string} Token JWT
 */
export const generarToken = (payload) => {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
  });
};

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT a verificar
 * @returns {Object|null} Payload decodificado o null si es inválido
 */
export const verificarToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret);
  } catch (error) {
    return null;
  }
};

/**
 * Decodifica un token sin verificar (útil para debugging)
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload decodificado o null
 */
export const decodificarToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

