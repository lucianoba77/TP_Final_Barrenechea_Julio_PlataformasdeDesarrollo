/**
 * Rutas de medicamentos
 */

import express from 'express';
import { body } from 'express-validator';
import {
  obtenerMedicamentos,
  obtenerMedicamento,
  crearMedicamento,
  actualizarMedicamento,
  eliminarMedicamento,
  marcarToma,
  restarStock,
  agregarStock,
} from '../controllers/medicamentosController.js';
import { autenticar } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Validadores
const validarCrearMedicamento = [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('presentacion').notEmpty().withMessage('Presentación es requerida'),
  body('tomasDiarias').optional().isInt({ min: 0 }).withMessage('Tomas diarias debe ser un número entero'),
  body('primeraToma').optional().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida (formato HH:mm)'),
  body('horariosTomas').optional().isArray().withMessage('horariosTomas debe ser un arreglo'),
  body('horariosTomas.*').optional().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horario inválido (formato HH:mm)'),
];

const validarActualizarMedicamento = [
  body('stockInicial').optional().isInt({ min: 0 }).withMessage('Stock inicial debe ser un número entero'),
  body('stockActual').optional().isInt({ min: 0 }).withMessage('Stock actual debe ser un número entero'),
  body('horariosTomas').optional().isArray().withMessage('horariosTomas debe ser un arreglo'),
  body('horariosTomas.*').optional().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horario inválido (formato HH:mm)'),
];

const validarMarcarToma = [
  body('hora').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida (formato HH:mm)'),
];

const validarAgregarStock = [
  body('cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser un número entero mayor a 0'),
  body('fechaVencimiento').notEmpty().withMessage('Fecha de vencimiento es requerida'),
];

// Rutas
router.get('/', obtenerMedicamentos);
router.get('/:id', obtenerMedicamento);
router.post('/', validarCrearMedicamento, crearMedicamento);
router.put('/:id', validarActualizarMedicamento, actualizarMedicamento);
router.delete('/:id', eliminarMedicamento);
router.post('/:id/marcar-toma', validarMarcarToma, marcarToma);
router.post('/:id/restar-stock', restarStock);
router.post('/:id/agregar-stock', validarAgregarStock, agregarStock);

export default router;

