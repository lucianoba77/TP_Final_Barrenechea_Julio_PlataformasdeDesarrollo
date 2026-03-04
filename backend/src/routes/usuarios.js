/**
 * Rutas de usuarios
 */

import express from 'express';
import { body } from 'express-validator';
import {
  obtenerPerfil,
  actualizarPerfil,
  eliminarCuenta,
} from '../controllers/usuariosController.js';
import { autenticar } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Validadores
const validarActualizarPerfil = [
  body('nombre').optional().isString().withMessage('Nombre inválido'),
];

const validarEliminarCuenta = [
  body('firebaseToken').notEmpty().withMessage('Token de Firebase requerido'),
];

// Rutas
router.get('/perfil', obtenerPerfil);
router.put('/perfil', validarActualizarPerfil, actualizarPerfil);
router.delete('/perfil', validarEliminarCuenta, eliminarCuenta);

export default router;

