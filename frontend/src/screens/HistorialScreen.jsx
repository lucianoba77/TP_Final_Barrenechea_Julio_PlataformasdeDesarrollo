import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMed } from '../context/MedContext';
import { useAuth } from '../context/AuthContext';
import MainMenu from '../components/MainMenu';
import UserMenu from '../components/UserMenu';
import { 
  calcularAdherencia,
  obtenerEstadoAdherencia
} from '../utils/adherenciaUtils';
import { esMedicamentoOcasional } from '../utils/medicamentoUtils';
import './HistorialScreen.css';

const HistorialScreen = () => {
  const navigate = useNavigate();
  const { medicamentos } = useMed();
  const { usuarioActual } = useAuth();

  const estaVencido = (medicamento) => {
    if (!medicamento?.fechaVencimiento) return false;
    const fechaVto = new Date(medicamento.fechaVencimiento);
    if (Number.isNaN(fechaVto.getTime())) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVto.setHours(0, 0, 0, 0);
    return fechaVto < hoy;
  };
  
  // Adherencia: solo medicamentos con seguimiento (no ocasionales)
  const medicamentosConSeguimiento = medicamentos.filter((med) => !esMedicamentoOcasional(med));
  const medicamentosConAdherencia = medicamentosConSeguimiento.filter((med) =>
    med.activo !== false && !estaVencido(med)
  );
  const activosVigentes = medicamentosConAdherencia.length;
  const noVigentes = medicamentosConSeguimiento.filter((med) =>
    med.activo === false || estaVencido(med)
  ).length;
  
  const esAsistente = usuarioActual?.role === 'asistente';
  const nombrePaciente = usuarioActual?.paciente?.nombre || 'Paciente';

  // Redirigir según el rol al hacer clic en home
  const handleHomeClick = () => {
    if (esAsistente) {
      navigate('/botiquin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="historial-screen">
      <div className="historial-header">
        <button className="btn-home" onClick={handleHomeClick}>🏠</button>
        <h1>{esAsistente ? `Adherencia del Paciente ${nombrePaciente}` : 'Adherencia'}</h1>
        <UserMenu />
      </div>

      <div className="historial-content">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#E3F2FD' }}>
              💊
            </div>
            <div className="stat-number">{medicamentosConSeguimiento.length}</div>
            <div className="stat-label">Con seguimiento</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#E8F5E9' }}>
              ✓
            </div>
            <div className="stat-number">{activosVigentes}</div>
            <div className="stat-label">Activos vigentes</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#F3E5F5' }}>
              📈
            </div>
            <div className="stat-number">{noVigentes}</div>
            <div className="stat-label">No vigentes</div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <div className="section-icon">📈</div>
            <h2 className="section-title">Adherencia por medicamento (Total)</h2>
          </div>
          
          <div className="adherencia-list">
            {medicamentosConAdherencia.length === 0 ? (
              <p className="empty-message">No hay medicamentos con adherencia registrada</p>
            ) : (
              medicamentosConAdherencia.map(medicamento => {
                  const adherenciaTotal = calcularAdherencia(medicamento, 'total');
                  const adherenciaMensual = calcularAdherencia(medicamento, 'mensual');
                  const adherenciaSemanal = calcularAdherencia(medicamento, 'semanal');
                  const estado = obtenerEstadoAdherencia(adherenciaTotal.porcentaje);
                  const esCronico = medicamento.esCronico || false;
                  
                  return (
                    <div key={medicamento.id} className="adherencia-item">
                      <div className="adherencia-item-header">
                        <div>
                          <span className="adherencia-nombre">{medicamento.nombre}</span>
                          {esCronico && <span className="cronico-badge">Crónico</span>}
                        </div>
                        <span className="adherencia-porcentaje" style={{ color: estado.color }}>
                          {adherenciaTotal.porcentaje}%
                        </span>
                      </div>
                      <div className="adherencia-bar-container">
                        <div 
                          className="adherencia-bar"
                          style={{ 
                            width: `${adherenciaTotal.porcentaje}%`,
                            backgroundColor: estado.color
                          }}
                        />
                      </div>
                      <div className="adherencia-stats">
                        <div className="stat-row">
                          <span className="stat-label"><strong>Total:</strong> {adherenciaTotal.realizadas}/{adherenciaTotal.esperadas} tomas ({adherenciaTotal.dias} días)</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Mensual: {adherenciaMensual.porcentaje}% ({adherenciaMensual.realizadas}/{adherenciaMensual.esperadas})</span>
                          <span className="stat-label">Semanal: {adherenciaSemanal.porcentaje}% ({adherenciaSemanal.realizadas}/{adherenciaSemanal.esperadas})</span>
                        </div>
                        <span className="stat-label">{estado.mensaje}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

      </div>

      <MainMenu />
    </div>
  );
};

export default HistorialScreen;

