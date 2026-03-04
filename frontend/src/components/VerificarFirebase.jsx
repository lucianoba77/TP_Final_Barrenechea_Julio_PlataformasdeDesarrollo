import React, { useState, useEffect } from 'react';
import { verificarTodasLasConexiones } from '../utils/verificarFirebase';
import './VerificarFirebase.css';

const VerificarFirebase = () => {
  const [verificando, setVerificando] = useState(false);
  const [reporte, setReporte] = useState(null);

  const ejecutarVerificacion = async () => {
    setVerificando(true);
    setReporte(null);
    
    try {
      const resultado = await verificarTodasLasConexiones();
      setReporte(resultado);
    } catch (error) {
      setReporte({
        error: true,
        mensaje: error.message
      });
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    // Ejecutar verificación automáticamente al montar el componente
    ejecutarVerificacion();
  }, []);

  if (verificando) {
    return (
      <div className="verificar-firebase">
        <div className="verificando">
          <div className="spinner"></div>
          <p>Verificando conexión a Firebase...</p>
        </div>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="verificar-firebase">
        <button onClick={ejecutarVerificacion} className="btn-verificar">
          Verificar Conexión a Firebase
        </button>
      </div>
    );
  }

  if (reporte.error) {
    return (
      <div className="verificar-firebase">
        <div className="error-box">
          <h3>❌ Error al Verificar</h3>
          <p>{reporte.mensaje}</p>
          <button onClick={ejecutarVerificacion} className="btn-verificar">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verificar-firebase">
      <div className="reporte-container">
        <h2>🔍 Reporte de Verificación de Firebase</h2>
        
        {/* Configuración */}
        <div className="seccion-verificacion">
          <h3>1️⃣ Configuración de Firebase</h3>
          <div className="estado-item">
            <span className={reporte.configuracion.firebaseInicializado ? 'ok' : 'error'}>
              {reporte.configuracion.firebaseInicializado ? '✅' : '❌'}
            </span>
            <span>Firebase inicializado</span>
          </div>
          <div className="estado-item">
            <span className={reporte.configuracion.authDisponible ? 'ok' : 'error'}>
              {reporte.configuracion.authDisponible ? '✅' : '❌'}
            </span>
            <span>Authentication disponible</span>
          </div>
          <div className="estado-item">
            <span className={reporte.configuracion.firestoreDisponible ? 'ok' : 'error'}>
              {reporte.configuracion.firestoreDisponible ? '✅' : '❌'}
            </span>
            <span>Firestore disponible</span>
          </div>
          {reporte.configuracion.errores.length > 0 && (
            <div className="errores">
              <strong>Errores:</strong>
              <ul>
                {reporte.configuracion.errores.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Authentication */}
        <div className="seccion-verificacion">
          <h3>2️⃣ Authentication</h3>
          <div className="estado-item">
            <span className={reporte.auth.disponible ? 'ok' : 'error'}>
              {reporte.auth.disponible ? '✅' : '❌'}
            </span>
            <span>Auth disponible</span>
          </div>
          <div className="estado-item">
            <span className={reporte.auth.configurado ? 'ok' : 'error'}>
              {reporte.auth.configurado ? '✅' : '❌'}
            </span>
            <span>Auth configurado</span>
          </div>
          {reporte.auth.errores.length > 0 && (
            <div className="errores">
              <strong>Errores:</strong>
              <ul>
                {reporte.auth.errores.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Firestore */}
        <div className="seccion-verificacion">
          <h3>3️⃣ Firestore Database</h3>
          <div className="estado-item">
            <span className={reporte.firestore.conectado ? 'ok' : 'error'}>
              {reporte.firestore.conectado ? '✅' : '❌'}
            </span>
            <span>Firestore conectado</span>
          </div>
          <div className="estado-item">
            <span className={reporte.firestore.puedeLeer ? 'ok' : 'warning'}>
              {reporte.firestore.puedeLeer ? '✅' : '⚠️'}
            </span>
            <span>Puede leer datos</span>
          </div>
          <div className="estado-item">
            <span className={reporte.firestore.puedeEscribir ? 'ok' : 'warning'}>
              {reporte.firestore.puedeEscribir ? '✅' : '⚠️'}
            </span>
            <span>Puede escribir datos</span>
          </div>
          {reporte.firestore.errores.length > 0 && (
            <div className="errores">
              <strong>Errores/Advertencias:</strong>
              <ul>
                {reporte.firestore.errores.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Resumen Final */}
        <div className={`resumen-final ${reporte.todoCorrecto ? 'exito' : 'problemas'}`}>
          <h3>
            {reporte.todoCorrecto ? '✅' : '❌'} Estado General
          </h3>
          <p>
            {reporte.todoCorrecto 
              ? '¡Todo está correcto! Firebase está conectado y funcionando.' 
              : 'Hay algunos problemas que necesitan atención. Revisa los errores arriba.'}
          </p>
        </div>

        <button onClick={ejecutarVerificacion} className="btn-verificar">
          🔄 Verificar Nuevamente
        </button>
      </div>
    </div>
  );
};

export default VerificarFirebase;

