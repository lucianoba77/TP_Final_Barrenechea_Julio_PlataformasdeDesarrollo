import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MainMenu.css';

const MainMenu = () => {
  const location = useLocation();
  const { usuarioActual } = useAuth();
  const esAsistente = usuarioActual?.role === 'asistente';

  return (
    <div className="main-menu">
      {!esAsistente && (
        <Link 
          to="/dashboard" 
          className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          <div className="menu-icon" style={{ backgroundColor: '#E3F2FD' }}>
            <span className="icon-home">🏠</span>
          </div>
          <span className="menu-text">Inicio</span>
        </Link>
      )}

      {!esAsistente && (
        <Link 
          to="/nuevo" 
          className={`menu-item ${location.pathname === '/nuevo' ? 'active' : ''}`}
        >
          <div className="menu-icon" style={{ backgroundColor: '#E8F5E9' }}>
            <span className="icon-plus">+</span>
          </div>
          <span className="menu-text">Nueva Medicina</span>
        </Link>
      )}

      <Link 
        to="/botiquin" 
        className={`menu-item ${location.pathname === '/botiquin' ? 'active' : ''}`}
      >
        <div className="menu-icon" style={{ backgroundColor: '#F3E5F5' }}>
          <span className="icon-cabinet">💊</span>
        </div>
        <span className="menu-text">Botiquín</span>
      </Link>

      <Link 
        to="/historial" 
        className={`menu-item ${location.pathname === '/historial' ? 'active' : ''}`}
      >
        <div className="menu-icon" style={{ backgroundColor: '#E1F5FE' }}>
          <span className="icon-history">📊</span>
        </div>
        <span className="menu-text">Adherencia</span>
      </Link>

      {!esAsistente && (
        <Link 
          to="/ajustes" 
          className={`menu-item ${location.pathname === '/ajustes' ? 'active' : ''}`}
        >
          <div className="menu-icon" style={{ backgroundColor: '#FFF3E0' }}>
            <span className="icon-settings">⚙</span>
          </div>
          <span className="menu-text">Ajustes</span>
        </Link>
      )}
    </div>
  );
};

export default MainMenu;

