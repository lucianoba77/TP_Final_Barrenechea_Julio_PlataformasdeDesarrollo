import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './UserMenu.css';

const UserMenu = () => {
  const navigate = useNavigate();
  const { usuarioActual, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    const manejarClickExterno = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAbierto(false);
      }
    };

    if (menuAbierto) {
      document.addEventListener('mousedown', manejarClickExterno);
    }

    return () => {
      document.removeEventListener('mousedown', manejarClickExterno);
    };
  }, [menuAbierto]);

  // Mostrar para pacientes y asistentes
  if (!usuarioActual) {
    return null;
  }

  const manejarCerrarSesion = async () => {
    setMenuAbierto(false);
    try {
      const resultado = await logout();
      // Esperar un momento para que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verificar que el logout fue exitoso
      if (resultado === undefined || resultado?.success !== false) {
        showSuccess('Sesión cerrada correctamente');
      }
      
      // Navegar al login
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showError('Error al cerrar sesión');
      // Intentar navegar de todas formas y limpiar el estado
      localStorage.removeItem('jwt_token');
      navigate('/login', { replace: true });
    }
  };

  const manejarIrAjustes = () => {
    // Los asistentes no tienen acceso a ajustes
    if (usuarioActual.role === 'asistente') {
      return;
    }
    navigate('/ajustes');
    setMenuAbierto(false);
  };

  const esAsistente = usuarioActual.role === 'asistente';

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button 
        className="user-icon-btn"
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label="Menú de usuario"
      >
        <div className="user-icon">👤</div>
      </button>
      {menuAbierto && (
        <div className="user-dropdown">
          {!esAsistente && (
            <button 
              className="dropdown-item"
              onClick={manejarIrAjustes}
            >
              ⚙️ Ajustes
            </button>
          )}
          <button 
            className="dropdown-item"
            onClick={manejarCerrarSesion}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

