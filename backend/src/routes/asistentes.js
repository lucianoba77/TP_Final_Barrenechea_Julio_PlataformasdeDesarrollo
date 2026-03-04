/**
 * Rutas de asistentes
 */

import express from 'express';
import { body, param } from 'express-validator';
import {
  obtenerAsistentes,
  crearAsistente,
  eliminarAsistente,
  verificarAsistente,
} from '../controllers/asistentesController.js';
import { autenticar } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Validadores
const validarCrearAsistente = [
  body('emailAsistente').isEmail().withMessage('Email inválido'),
  body('nombreAsistente').notEmpty().withMessage('Nombre es requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// Rutas
router.get('/', obtenerAsistentes);
router.post('/', validarCrearAsistente, crearAsistente);
router.delete('/:id', eliminarAsistente);
router.get('/verificar/:email', param('email').isEmail().withMessage('Email inválido'), verificarAsistente);

export default router;

