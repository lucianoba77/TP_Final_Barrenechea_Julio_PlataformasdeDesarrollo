/**
 * Configuración de Firebase Admin SDK
 * Se usa para operaciones del lado del servidor
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config(); 

let firebaseInitialized = false;

// Verificar que las variables de entorno estén configuradas
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('❌ Error: Variables de entorno de Firebase Admin no configuradas');
  console.error('Por favor, configura FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY y FIREBASE_CLIENT_EMAIL en .env');
  process.exit(1);
}

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  try {
    // Procesar el private key: reemplazar \n literales por saltos de línea reales
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/^"/, '')  // Remover comilla inicial
      .replace(/"$/, '')   // Remover comilla final
      .replace(/\\n/g, '\n'); // Reemplazar \n literales por saltos de línea
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin:', error);
    console.error('Verifica que las credenciales en .env sean correctas');
    process.exit(1);
  }
} else {
  firebaseInitialized = true;
}

// Exportar servicios solo si Firebase está inicializado
if (!firebaseInitialized) {
  throw new Error('Firebase Admin no está inicializado. Verifica la configuración.');
}

export const auth = admin.auth();
export const db = admin.firestore();

export default admin;

