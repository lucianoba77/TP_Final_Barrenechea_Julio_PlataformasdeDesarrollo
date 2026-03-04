import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import api, { setToken, removeToken } from './apiService';

export const registrarUsuario = async (email, password, nombre) => {
  try {
    const { esAsistenteDe } = await import('./asistentesService');
    const asistenteResult = await esAsistenteDe(email);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: nombre
    });
    let role = 'paciente';
    let pacienteId = null;
    let nombreFinal = nombre;
    
    if (asistenteResult.success && asistenteResult.esAsistente) {
      role = 'asistente';
      pacienteId = asistenteResult.pacienteId;
      if (asistenteResult.asistente && asistenteResult.asistente.nombreAsistente) {
        nombreFinal = asistenteResult.asistente.nombreAsistente;
        await updateProfile(user, {
          displayName: nombreFinal
        });
      }
    }
    const usuarioData = {
      id: user.uid,
      email: user.email,
      nombre: nombreFinal,
      role: role,
      pacienteId: pacienteId,
      tipoSuscripcion: 'gratis',
      esPremium: false,
      fechaCreacion: new Date().toISOString(),
      ultimaSesion: new Date().toISOString()
    };

    await setDoc(doc(db, 'usuarios', user.uid), usuarioData);

    // Obtener JWT del backend para que las llamadas API no devuelvan 401
    try {
      const firebaseToken = await user.getIdToken();
      const response = await api.post('/auth/login', { firebaseToken });
      if (response.success && response.token) {
        setToken(response.token);
      }
    } catch (apiError) {
      console.warn('Registro OK pero no se pudo obtener JWT:', apiError);
    }

    return {
      success: true,
      usuario: usuarioData
    };
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return {
      success: false,
      error: obtenerMensajeError(error.code)
    };
  }
};

export const iniciarSesion = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const firebaseToken = await user.getIdToken();

    try {
      const response = await api.post('/auth/login', { firebaseToken });
      
      if (response.success && response.token) {
        setToken(response.token);
        return {
          success: true,
          usuario: response.usuario
        };
      } else {
        await signOut(auth);
        return {
          success: false,
          error: response.error || 'Error al obtener token del servidor'
        };
      }
    } catch (apiError) {
      await signOut(auth);
      return {
        success: false,
        error: apiError.message || 'Error al conectar con el servidor'
      };
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      try {
        const { esAsistenteDe } = await import('./asistentesService');
        const asistenteResult = await esAsistenteDe(email, { ignorarPacienteId: null });
        
        if (asistenteResult.success && asistenteResult.esAsistente) {
          return {
            success: false,
            error: 'Este email corresponde a un asistente, pero aún no has creado tu cuenta. Por favor, ve a "Registrarse" y crea tu cuenta con este email y la contraseña que te proporcionó el paciente.'
          };
        }
      } catch (verificacionError) {
        console.error('Error al verificar asistente:', verificacionError);
      }
    }
    
    return {
      success: false,
      error: obtenerMensajeError(error.code)
    };
  }
};

export const iniciarSesionConGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });

    // Intentar popup primero (evita problemas de redirect en Chrome/Windows donde
    // el resultado se pierde al pasar por firebaseapp.com)
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const { esAsistenteDe } = await import('./asistentesService');
      const asistenteResult = await esAsistenteDe(user.email, { ignorarPacienteId: user.uid });
      if (asistenteResult.success && asistenteResult.esAsistente) {
        await signOut(auth);
        return {
          success: false,
          error: 'Los asistentes solo pueden iniciar sesión con email y contraseña. No pueden usar Google login.'
        };
      }

      const firebaseToken = await user.getIdToken();
      const response = await api.post('/auth/login', { firebaseToken });
      if (response.success && response.token) {
        setToken(response.token);
        return { success: true, usuario: response.usuario };
      }
      await signOut(auth);
      return {
        success: false,
        error: response.error || 'Error al obtener token del servidor'
      };
    } catch (popupError) {
      // Si el popup está bloqueado o falla (ej. COOP), usar redirect
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
        return { success: true, redirecting: true };
      }
      throw popupError;
    }
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    console.error('Detalles del error:', {
      code: error.code,
      message: error.message,
      email: error.email,
      credential: error.credential
    });
    
    let mensajeError = obtenerMensajeError(error.code);
    
    if (error.code === 'auth/unauthorized-domain') {
      mensajeError = 'Este dominio no está autorizado. Verifica la configuración de Firebase.';
    } else if (error.code === 'auth/operation-not-allowed') {
      mensajeError = 'El login con Google no está habilitado. Verifica la configuración de Firebase Auth.';
    } else if (error.code === 'auth/invalid-api-key') {
      mensajeError = 'La API key de Firebase no es válida. Verifica la configuración.';
    } else if (error.code === 'auth/network-request-failed') {
      mensajeError = 'Error de conexión. Verifica tu internet.';
    } else if (!error.code && error.message) {
      // Si no hay código pero hay mensaje, usar el mensaje
      mensajeError = error.message;
    }
    
    return {
      success: false,
      error: mensajeError
    };
  }
};

// Función para manejar el resultado del redirect cuando el usuario vuelve
// Si se pasa resultRedirect, se usa ese (evita llamar getRedirectResult dos veces; Firebase solo devuelve el resultado una vez)
export const manejarRedirectGoogle = async (resultRedirect = null) => {
  try {
    const result = resultRedirect !== null && resultRedirect !== undefined
      ? resultRedirect
      : await getRedirectResult(auth);
    
    if (!result) {
      // No hay resultado, el usuario no vino de un redirect de Google
      return {
        success: false,
        error: null // No es un error, simplemente no hay resultado
      };
    }

    const user = result.user;
    const { esAsistenteDe } = await import('./asistentesService');
    const asistenteResult = await esAsistenteDe(user.email, { ignorarPacienteId: user.uid });
    
    if (asistenteResult.success && asistenteResult.esAsistente) {
      await signOut(auth);
      return {
        success: false,
        error: 'Los asistentes solo pueden iniciar sesión con email y contraseña. No pueden usar Google login.'
      };
    }

    const firebaseToken = await user.getIdToken();

    try {
      const response = await api.post('/auth/login', { firebaseToken });
      
      if (response.success && response.token) {
        setToken(response.token);
        return {
          success: true,
          usuario: response.usuario
        };
      } else {
        await signOut(auth);
        return {
          success: false,
          error: response.error || 'Error al obtener token del servidor'
        };
      }
    } catch (apiError) {
      await signOut(auth);
      return {
        success: false,
        error: apiError.message || 'Error al conectar con el servidor'
      };
    }
  } catch (error) {
    console.error('Error al manejar redirect de Google:', error);
    
    let mensajeError = obtenerMensajeError(error.code);
    
    if (error.code === 'auth/account-exists-with-different-credential') {
      mensajeError = 'Ya existe una cuenta con este email usando otro método de login.';
    }
    
    return {
      success: false,
      error: mensajeError
    };
  }
};

export const cerrarSesion = async () => {
  try {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Error al hacer logout en el backend:', error);
    }
    
    removeToken();
    await signOut(auth);
    
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    removeToken();
    return {
      success: false,
      error: error.message
    };
  }
};

export const observarEstadoAuth = (callback) => {
  let unsubscribe = null;
  
  // Función auxiliar para procesar usuario autenticado
  const procesarUsuario = async (user) => {
    try {
      const { esAsistenteDe } = await import('./asistentesService');
      const asistenteResult = await esAsistenteDe(user.email, { ignorarPacienteId: user.uid });
      
      if (asistenteResult.success && asistenteResult.esAsistente) {
        const tieneGoogleProvider = user.providerData.some(provider => provider.providerId === 'google.com');
        if (tieneGoogleProvider) {
          await signOut(auth);
          removeToken();
          callback(null);
          return;
        }
      }

      const firebaseToken = await user.getIdToken();
      
      try {
        const response = await api.post('/auth/login', { firebaseToken });
        
        if (response.success && response.token) {
          setToken(response.token);
          callback(response.usuario);
        } else {
          await signOut(auth);
          removeToken();
          callback(null);
        }
      } catch (apiError) {
        console.error('Error al obtener JWT del backend:', apiError);
        await signOut(auth);
        removeToken();
        callback(null);
      }
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      callback(null);
    }
  };
  
  // Primero, verificar si hay un resultado de redirect pendiente (solo se devuelve una vez)
  getRedirectResult(auth).then(async (result) => {
    if (result) {
      // Pasar el result para no consumirlo dos veces
      const redirectResult = await manejarRedirectGoogle(result);
      if (redirectResult.success && redirectResult.usuario) {
        callback(redirectResult.usuario);
      } else if (redirectResult.error) {
        console.error('Error en redirect de Google:', redirectResult.error);
      }
    }
    
    // Luego, observar cambios en el estado de autenticación
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await procesarUsuario(user);
      } else {
        removeToken();
        callback(null);
      }
    });
  }).catch((error) => {
    console.error('Error al verificar redirect result:', error);
    // Continuar con la observación normal
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await procesarUsuario(user);
      } else {
        removeToken();
        callback(null);
      }
    });
  });
  
  // Retornar una función de limpieza
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
};

export const obtenerUsuarioActual = async () => {
  if (!auth.currentUser) {
    return null;
  }

  try {
    const usuarioDoc = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
    if (usuarioDoc.exists()) {
      return {
        id: auth.currentUser.uid,
        email: auth.currentUser.email,
        nombre: auth.currentUser.displayName || usuarioDoc.data().nombre,
        ...usuarioDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return null;
  }
};

export const esUsuarioGoogle = () => {
  if (!auth.currentUser) {
    return false;
  }
  
  const user = auth.currentUser;
  // Verificar si tiene proveedor de Google
  return user.providerData.some(provider => provider.providerId === 'google.com');
};

export const eliminarCuenta = async (email, password, esGoogle = false) => {
  try {
    if (!auth.currentUser) {
      return {
        success: false,
        error: 'No hay usuario autenticado'
      };
    }

    const user = auth.currentUser;

    if (esGoogle) {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
    } else {
      if (user.email !== email) {
        return {
          success: false,
          error: 'El email no coincide con tu cuenta'
        };
      }
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);
    }

    const firebaseToken = await user.getIdToken();

    try {
      const response = await api.delete('/usuarios/perfil', {
        body: JSON.stringify({ firebaseToken })
      });

      if (response.success) {
        removeToken();
        await signOut(auth);
        
        return {
          success: true
        };
      } else {
        return {
          success: false,
          error: response.error || 'Error al eliminar la cuenta'
        };
      }
    } catch (apiError) {
      console.error('Error al eliminar cuenta en el backend:', apiError);
      return {
        success: false,
        error: apiError.message || 'Error al eliminar la cuenta'
      };
    }
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    
    let mensajeError = 'Error al eliminar la cuenta';
    if (error.code === 'auth/wrong-password') {
      mensajeError = 'Contraseña incorrecta';
    } else if (error.code === 'auth/invalid-credential') {
      mensajeError = 'Credenciales inválidas';
    } else if (error.code === 'auth/requires-recent-login') {
      mensajeError = 'Por seguridad, debes iniciar sesión nuevamente antes de eliminar tu cuenta';
    } else if (error.message) {
      mensajeError = error.message;
    }

    return {
      success: false,
      error: mensajeError
    };
  }
};

const obtenerMensajeError = (codigoError) => {
  const mensajes = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-email': 'El email no es válido',
    'auth/operation-not-allowed': 'Operación no permitida. Verifica que Google esté habilitado en Firebase Auth.',
    'auth/weak-password': 'La contraseña es muy débil',
    'auth/user-disabled': 'Este usuario ha sido deshabilitado',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/popup-closed-by-user': 'El popup fue cerrado. Intenta nuevamente.',
    'auth/popup-blocked': 'El popup fue bloqueado. Permite ventanas emergentes.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase.',
    'auth/cancelled-popup-request': 'Solo se puede abrir un popup a la vez.',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email usando otro método de login.',
    'auth/invalid-api-key': 'La API key de Firebase no es válida. Verifica la configuración.'
  };

  return mensajes[codigoError] || `Error de autenticación: ${codigoError || 'Error desconocido'}`;
};

