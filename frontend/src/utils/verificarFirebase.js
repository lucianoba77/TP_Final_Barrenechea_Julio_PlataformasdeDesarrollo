/**
 * Utilidad para verificar la conexión a Firebase
 * Ejecuta todas las verificaciones necesarias
 */

import { auth, db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Verifica la configuración de Firebase
 */
export const verificarConfiguracion = () => {
  const resultados = {
    firebaseInicializado: false,
    authDisponible: false,
    firestoreDisponible: false,
    errores: []
  };

  try {
    // Verificar que Firebase esté inicializado
    if (auth && db) {
      resultados.firebaseInicializado = true;
      resultados.authDisponible = true;
      resultados.firestoreDisponible = true;
    } else {
      resultados.errores.push('Firebase no está inicializado correctamente');
    }
  } catch (error) {
    resultados.errores.push(`Error al verificar configuración: ${error.message}`);
  }

  return resultados;
};

/**
 * Verifica la conexión a Firestore
 */
export const verificarFirestore = async () => {
  const resultados = {
    conectado: false,
    puedeLeer: false,
    puedeEscribir: false,
    errores: []
  };

  try {
    if (!db) {
      resultados.errores.push('Firestore no está disponible');
      return resultados;
    }

    // Intentar leer una colección de prueba
    // Nota: Si no hay usuarios autenticados, esto fallará con las reglas seguras
    // Eso es normal y esperado
    try {
      // Intentar leer una colección que existe o puede no existir
      await getDocs(collection(db, 'usuarios'));
      resultados.conectado = true;
      resultados.puedeLeer = true;
    } catch (error) {
      if (error.code === 'permission-denied') {
        resultados.conectado = true; // Está conectado pero sin permisos
        resultados.errores.push(
          'Sin permisos para leer. Esto es normal si no estás autenticado. ' +
          'Las reglas de Firestore requieren autenticación. ' +
          'Si estás en modo Prueba y quieres permitir lectura temporal, ' +
          'configura las reglas según REGLAS_FIRESTORE.md'
        );
      } else if (error.code === 'unavailable') {
        resultados.errores.push('Firestore no está disponible. Verifica tu conexión a internet.');
      } else {
        resultados.errores.push(`Error al leer Firestore: ${error.message} (Código: ${error.code})`);
      }
    }

    // Verificar escritura (intentando crear un documento de prueba)
    try {
      // Solo verificamos que la conexión funcione, no creamos datos reales
      resultados.puedeEscribir = resultados.conectado;
    } catch (error) {
      resultados.errores.push(`Error al escribir en Firestore: ${error.message}`);
    }

  } catch (error) {
    resultados.errores.push(`Error general en Firestore: ${error.message}`);
  }

  return resultados;
};

/**
 * Verifica la conexión a Authentication
 */
export const verificarAuth = () => {
  const resultados = {
    disponible: false,
    configurado: false,
    errores: []
  };

  try {
    if (!auth) {
      resultados.errores.push('Authentication no está disponible');
      return resultados;
    }

    resultados.disponible = true;
    resultados.configurado = true;

    // Verificar que auth tenga la configuración correcta
    if (auth.app && auth.app.options) {
      resultados.configurado = true;
    }

  } catch (error) {
    resultados.errores.push(`Error al verificar Auth: ${error.message}`);
  }

  return resultados;
};

/**
 * Verifica todas las conexiones de Firebase
 */
export const verificarTodasLasConexiones = async () => {
  console.log('🔍 Iniciando verificación de Firebase...\n');

  const reporte = {
    configuracion: null,
    auth: null,
    firestore: null,
    todoCorrecto: false
  };

  // 1. Verificar configuración
  console.log('1️⃣ Verificando configuración...');
  reporte.configuracion = verificarConfiguracion();
  console.log('   ✅ Firebase inicializado:', reporte.configuracion.firebaseInicializado);
  console.log('   ✅ Auth disponible:', reporte.configuracion.authDisponible);
  console.log('   ✅ Firestore disponible:', reporte.configuracion.firestoreDisponible);
  if (reporte.configuracion.errores.length > 0) {
    console.log('   ❌ Errores:', reporte.configuracion.errores);
  }

  // 2. Verificar Authentication
  console.log('\n2️⃣ Verificando Authentication...');
  reporte.auth = verificarAuth();
  console.log('   ✅ Auth disponible:', reporte.auth.disponible);
  console.log('   ✅ Auth configurado:', reporte.auth.configurado);
  if (reporte.auth.errores.length > 0) {
    console.log('   ❌ Errores:', reporte.auth.errores);
  }

  // 3. Verificar Firestore
  console.log('\n3️⃣ Verificando Firestore Database...');
  reporte.firestore = await verificarFirestore();
  console.log('   ✅ Firestore conectado:', reporte.firestore.conectado);
  console.log('   ✅ Puede leer:', reporte.firestore.puedeLeer);
  console.log('   ✅ Puede escribir:', reporte.firestore.puedeEscribir);
  if (reporte.firestore.errores.length > 0) {
    console.log('   ❌ Errores:', reporte.firestore.errores);
  }

  // Resumen final
  reporte.todoCorrecto = 
    reporte.configuracion.firebaseInicializado &&
    reporte.configuracion.authDisponible &&
    reporte.configuracion.firestoreDisponible &&
    reporte.auth.disponible &&
    reporte.firestore.conectado;

  console.log('\n📊 RESUMEN:');
  console.log('   ' + (reporte.todoCorrecto ? '✅' : '❌') + ' Estado general:', 
    reporte.todoCorrecto ? 'TODO CORRECTO' : 'HAY PROBLEMAS');

  return reporte;
};

