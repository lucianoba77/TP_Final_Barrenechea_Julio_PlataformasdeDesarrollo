import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  iniciarSesion as iniciarSesionFirebase,
  registrarUsuario as registrarUsuarioFirebase,
  cerrarSesion as cerrarSesionFirebase,
  observarEstadoAuth,
  iniciarSesionConGoogle as iniciarSesionConGoogleFirebase,
  eliminarCuenta as eliminarCuentaFirebase
} from '../services/authService';
import { esAsistenteDe } from '../services/asistentesService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Observar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = observarEstadoAuth((usuario) => {
      setUsuarioActual(usuario);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setCargando(true);
    const resultado = await iniciarSesionFirebase(email, password);
    setCargando(false);
    return resultado;
  };

  const registro = async (email, password, nombre) => {
    setCargando(true);
    const resultado = await registrarUsuarioFirebase(email, password, nombre);
    setCargando(false);
    return resultado;
  };

  const loginWithGoogle = async () => {
    setCargando(true);
    try {
      const resultado = await iniciarSesionConGoogleFirebase();
      
      if (resultado.success) {
        if (!resultado.usuario?.role) {
          const asistenteResult = await esAsistenteDe(resultado.usuario.email, { ignorarPacienteId: resultado.usuario.id });
          
          if (asistenteResult.success && asistenteResult.esAsistente) {
            resultado.usuario.role = 'asistente';
            resultado.usuario.pacienteId = asistenteResult.pacienteId;
            resultado.usuario.paciente = asistenteResult.paciente;
          } else {
            resultado.usuario.role = 'paciente';
          }
        }
        
        setUsuarioActual(resultado.usuario);
      }
      
      setCargando(false);
      return resultado;
    } catch (error) {
      setCargando(false);
      return {
        success: false,
        error: error.message || 'Error al iniciar sesión con Google'
      };
    }
  };

  const logout = async () => {
    try {
      setCargando(true);
      const resultado = await cerrarSesionFirebase();
      setUsuarioActual(null);
      return resultado;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aun así, limpiar el estado local
      setUsuarioActual(null);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setCargando(false);
    }
  };

  const eliminarCuenta = async (email, password, esGoogle = false) => {
    setCargando(true);
    try {
      const resultado = await eliminarCuentaFirebase(email, password, esGoogle);
      if (resultado.success) {
        setUsuarioActual(null);
      }
      return resultado;
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar la cuenta'
      };
    } finally {
      setCargando(false);
    }
  };

  // Verificar si el usuario es asistente al cargar
  useEffect(() => {
    const verificarRolAsistente = async () => {
      if (usuarioActual && usuarioActual.email && !usuarioActual.role) {
        const asistenteResult = await esAsistenteDe(usuarioActual.email, { ignorarPacienteId: usuarioActual.id || usuarioActual.uid });
        
        if (asistenteResult.success && asistenteResult.esAsistente) {
          setUsuarioActual(prev => ({
            ...prev,
            role: 'asistente',
            pacienteId: asistenteResult.pacienteId,
            paciente: asistenteResult.paciente
          }));
        } else if (!usuarioActual.role) {
          // Si no es asistente y no tiene role, es paciente
          setUsuarioActual(prev => ({
            ...prev,
            role: 'paciente'
          }));
        }
      }
    };

    if (usuarioActual) {
      verificarRolAsistente();
    }
  }, [usuarioActual]);

  return (
    <AuthContext.Provider value={{ 
      usuarioActual, 
      login, 
      registro,
      loginWithGoogle,
      logout,
      eliminarCuenta, 
      cargando 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

