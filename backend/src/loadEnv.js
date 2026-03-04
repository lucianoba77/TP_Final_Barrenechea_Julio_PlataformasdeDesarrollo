/**
 * Carga variables de entorno desde backend/.env antes que cualquier otro módulo.
 * Debe ser el primer import en server.js para que las rutas (y calendarService) vean process.env.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });
