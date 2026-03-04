/**
 * Servidor principal de la API
 * MiMedicina Backend
 */

import './src/loadEnv.js'; // Cargar .env antes que cualquier ruta/servicio
import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.js';
import medicamentosRoutes from './src/routes/medicamentos.js';
import asistentesRoutes from './src/routes/asistentes.js';
import usuariosRoutes from './src/routes/usuarios.js';
import calendarRoutes from './src/routes/calendar.js';

const hasCalendarClientId = !!(process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID);
const hasCalendarSecret = !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const hasCalendarRedirect = !!process.env.GOOGLE_CALENDAR_REDIRECT_URI;
if (!hasCalendarClientId || !hasCalendarSecret || !hasCalendarRedirect) {
  console.warn('⚠️ Google Calendar: faltan variables en .env →', {
    client_id: hasCalendarClientId ? 'ok' : 'FALTA',
    client_secret: hasCalendarSecret ? 'ok' : 'FALTA',
    redirect_uri: hasCalendarRedirect ? 'ok' : 'FALTA',
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:5000'
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todos los orígenes en desarrollo
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API MiMedicina - Endpoints disponibles en /api',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      medicamentos: '/api/medicamentos',
      asistentes: '/api/asistentes',
      usuarios: '/api/usuarios',
      calendar: '/api/calendar'
    }
  });
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API MiMedicina funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/medicamentos', medicamentosRoutes);
app.use('/api/asistentes', asistentesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/calendar', calendarRoutes);

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

