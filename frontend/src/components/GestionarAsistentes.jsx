import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { esUsuarioGoogle } from '../services/authService';
import { agregarAsistente, obtenerAsistentes, eliminarAsistente } from '../services/asistentesService';
import './GestionarAsistentes.css';

const GestionarAsistentes = () => {
  const { usuarioActual } = useAuth();
  const { showSuccess, showError, showConfirm } = useNotification();
  const navigate = useNavigate();
  const [asistentes, setAsistentes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    password: ''
  });

  useEffect(() => {
    if (usuarioActual && usuarioActual.role === 'paciente') {
      cargarAsistentes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual]);

  const cargarAsistentes = async () => {
    if (!usuarioActual) return;
    const pacienteId = usuarioActual.id || usuarioActual.uid;
    if (!pacienteId) {
      showError('No pudimos identificar tu cuenta. Intenta cerrar sesión e ingresar nuevamente.');
      return;
    }

    setCargando(true);
    const resultado = await obtenerAsistentes(pacienteId);
    if (resultado.success) {
      setAsistentes(resultado.asistentes);
    } else {
      showError(resultado.error || 'Error al cargar asistentes');
    }
    setCargando(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const pacienteId = usuarioActual?.id || usuarioActual?.uid;
    if (!pacienteId) {
      showError('No pudimos identificar tu cuenta. Intenta cerrar sesión e ingresar nuevamente.');
      return;
    }

    if (!formData.email.trim() || !formData.nombre.trim() || !formData.password.trim()) {
      showError('Por favor completa todos los campos');
      return;
    }

    if (formData.password.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCargando(true);
    
    // Determinar si el paciente se logueó con Google
    const esGoogle = esUsuarioGoogle();
    const credencialesPaciente = {
      email: usuarioActual?.email,
      esGoogle: esGoogle
    };

    const resultado = await agregarAsistente(
      pacienteId,
      formData.email.trim(),
      formData.nombre.trim(),
      formData.password.trim(),
      credencialesPaciente
    );

    if (resultado.success) {
      if (resultado.requiereReLogin) {
        showSuccess(resultado.mensaje || 'Asistente creado exitosamente. Por favor, inicia sesión nuevamente.');
        // Redirigir al login después de un breve delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (resultado.sesionRestaurada) {
        // Si la sesión se restauró correctamente, solo mostrar mensaje de éxito
        showSuccess(`Asistente ${formData.nombre} agregado exitosamente. El asistente puede iniciar sesión con el email "${formData.email.trim()}" y la contraseña proporcionada.`);
        setFormData({ email: '', nombre: '', password: '' });
        setMostrarFormulario(false);
        cargarAsistentes();
        // Esperar un momento para que el estado de autenticación se actualice
        setTimeout(() => {
          // Recargar la página para asegurar que el estado se actualice
          window.location.reload();
        }, 1000);
      } else {
        showSuccess(`Asistente ${formData.nombre} agregado exitosamente. El asistente puede iniciar sesión con el email "${formData.email.trim()}" y la contraseña proporcionada.`);
        setFormData({ email: '', nombre: '', password: '' });
        setMostrarFormulario(false);
        cargarAsistentes();
      }
    } else {
      showError(resultado.error || 'Error al agregar asistente');
    }
    setCargando(false);
  };

  const handleEliminar = async (asistenteId, nombreAsistente) => {
    const confirmado = await showConfirm({
      title: 'Eliminar asistente',
      message: `¿Estás seguro de que deseas eliminar a "${nombreAsistente}"? Ya no podrá ver tu información.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmado) {
      setCargando(true);
      const resultado = await eliminarAsistente(asistenteId);
      
      if (resultado.success) {
        showSuccess('Asistente eliminado exitosamente');
        cargarAsistentes();
      } else {
        showError(resultado.error || 'Error al eliminar asistente');
      }
      setCargando(false);
    }
  };

  if (!usuarioActual || usuarioActual.role !== 'paciente') {
    return null;
  }

  return (
    <div className="gestionar-asistentes">
      <div className="asistentes-header">
        <p className="asistentes-description">Agrega asistentes que puedan ver tu botiquín e historial de adherencia</p>
        <button
          className="btn-agregar-asistente"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          disabled={cargando}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Agregar Asistente'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="formulario-asistente">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nombre">Nombre del asistente</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: María García"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email del asistente</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ejemplo@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña del asistente</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
              <p className="help-text">
                El asistente podrá iniciar sesión con este email y contraseña
              </p>
            </div>

            <button type="submit" className="btn-enviar" disabled={cargando}>
              {cargando ? 'Agregando...' : 'Agregar Asistente'}
            </button>
          </form>
        </div>
      )}

      <div className="lista-asistentes">
        {cargando && asistentes.length === 0 ? (
          <p className="loading-text">Cargando asistentes...</p>
        ) : asistentes.length === 0 ? (
          <div className="empty-state">
            <p>No tienes asistentes agregados</p>
            <p className="empty-hint">Agrega un asistente para que pueda ver tu botiquín e historial</p>
          </div>
        ) : (
          <div className="asistentes-grid">
            {asistentes.map(asistente => (
              <div key={asistente.id} className="asistente-card">
                <div className="asistente-info">
                  <div className="asistente-avatar">
                    {asistente.nombreAsistente.charAt(0).toUpperCase()}
                  </div>
                  <div className="asistente-details">
                    <h4>{asistente.nombreAsistente}</h4>
                    <p className="asistente-email">{asistente.emailAsistente}</p>
                    <p className="asistente-fecha">
                      Agregado el {new Date(asistente.fechaAgregado).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  className="btn-eliminar-asistente"
                  onClick={() => handleEliminar(asistente.id, asistente.nombreAsistente)}
                  disabled={cargando}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="info-box">
        <h4>ℹ️ Información importante</h4>
        <ul>
          <li>Los asistentes solo pueden ver tu botiquín e historial de adherencia</li>
          <li>No pueden ver tu dashboard diario ni ajustes</li>
          <li>No pueden agregar, editar o eliminar medicamentos</li>
          <li>Los asistentes deben registrarse o iniciar sesión con el email y contraseña que proporcionaste</li>
          <li>Los asistentes NO pueden usar login con Google, solo email y contraseña</li>
          <li>El asistente se conectará desde otro dispositivo, cerrará su sesión de paciente (si la tiene) e iniciará sesión con sus credenciales de asistente</li>
        </ul>
      </div>
    </div>
  );
};

export default GestionarAsistentes;

