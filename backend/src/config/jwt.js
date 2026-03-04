/**
 * Configuración de JWT
 */

import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'secret_default_cambiar_en_produccion';

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// Validar que JWT_SECRET esté configurado de forma segura.
// En desarrollo permitimos fallback para no bloquear, en producción no.
const usingDefaultSecret = !process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

if (usingDefaultSecret) {
  if (isProduction) {
    throw new Error(
      'JWT_SECRET no está configurado de forma segura en producción. Define JWT_SECRET en backend/.env'
    );
  }
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET no está configurado o usa el valor por defecto');
  console.warn('⚠️  En desarrollo funciona, pero en producción debes configurar un JWT_SECRET único');
}

