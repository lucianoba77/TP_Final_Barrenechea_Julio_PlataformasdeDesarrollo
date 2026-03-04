/**
 * Rutas de Google Calendar
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  conectar,
  desconectar,
  verificarEstado,
} from '../controllers/calendarController.js';
import { autenticar } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Validadores: aceptar tokenData O code (al menos uno)
const validarConectar = [
  body()
    .custom((val, { req }) => {
      const hasToken = req.body?.tokenData?.access_token;
      const hasCode = req.body?.code;
      if (hasToken || hasCode) return true;
      throw new Error('Se requiere tokenData.access_token o code');
    }),
];

const manejarValidaciones = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errores.array()[0]?.msg || 'Error de validación',
      detalles: errores.array(),
    });
  }
  return next();
};

// Rutas
router.post('/conectar', validarConectar, manejarValidaciones, conectar);
router.delete('/desconectar', desconectar);
router.get('/estado', verificarEstado);

export default router;

