/**
 * Rutas de autenticación
 */

import express from 'express';
import { body } from 'express-validator';
import { login, registro, logout, obtenerPerfil } from '../controllers/authController.js';
import { autenticar } from '../middleware/auth.js';

const router = express.Router();

// Validadores
const validarLogin = [
  body('firebaseToken').notEmpty().withMessage('Token de Firebase requerido'),
];

const validarRegistro = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombre').notEmpty().withMessage('Nombre requerido'),
];

// Rutas públicas
router.post('/login', validarLogin, login);
router.post('/registro', validarRegistro, registro);

// Rutas protegidas
router.post('/logout', autenticar, logout);
router.get('/perfil', autenticar, obtenerPerfil);

export default router;

