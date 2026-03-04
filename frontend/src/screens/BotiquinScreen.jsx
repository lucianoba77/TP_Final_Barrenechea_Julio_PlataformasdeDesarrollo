import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMed } from '../context/MedContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { obtenerIconoPresentacion } from '../utils/presentacionIcons';
import { esMedicamentoOcasional } from '../utils/medicamentoUtils';
import MainMenu from '../components/MainMenu';
import UserMenu from '../components/UserMenu';
import './BotiquinScreen.css';

const ALERT_SETTINGS_KEY = 'alert_settings';

const BotiquinScreen = () => {
  const navigate = useNavigate();
  const { medicamentos, eliminarMedicina, suspenderMedicina, restarStock } = useMed();
  const { usuarioActual } = useAuth();
  const { showConfirm, showSuccess, showError } = useNotification();
  const preferenciasAlerta = React.useMemo(() => {
    const defaults = {
      notificacionesActivas: true,
      diasAntesStock: 7,
    };
    try {
      const raw = localStorage.getItem(ALERT_SETTINGS_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        notificacionesActivas: parsed?.notificacionesActivas !== false,
        diasAntesStock: Math.max(1, Number(parsed?.diasAntesStock) || 7),
      };
    } catch {
      return defaults;
    }
  }, []);
  
  const esAsistente = usuarioActual?.role === 'asistente';
  const nombrePaciente = usuarioActual?.paciente?.nombre || 'Paciente';

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin registrar';
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return 'Sin registrar';
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const calcularPorcentajeStock = (medicamento) => {
    if (!medicamento || !medicamento.stockInicial || medicamento.stockInicial <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (medicamento.stockActual / medicamento.stockInicial) * 100));
  };

  const obtenerTextoStock = (medicamento) => {
    if (!medicamento || medicamento.stockActual === undefined || medicamento.stockActual === null) {
      return 'Sin stock disponible';
    }
    
    const stockActual = Number(medicamento.stockActual) || 0;
    
    if (stockActual <= 0) {
      return 'Sin stock disponible';
    }
    
    if (!esMedicamentoOcasional(medicamento) && Number(medicamento.tomasDiarias) > 0) {
      let tomasDiariasEstimadas = Math.max(1, Number(medicamento.tomasDiarias) || 1);

      if (medicamento.usarProgramacionPersonalizada && medicamento.programacionPersonalizada) {
        const totalSemanal = Object.values(medicamento.programacionPersonalizada).reduce((total, horarios) => {
          if (!Array.isArray(horarios)) return total;
          return total + horarios.length;
        }, 0);

        if (totalSemanal > 0) {
          tomasDiariasEstimadas = totalSemanal / 7;
        }
      }

      const diasRestantes = Math.floor(stockActual / tomasDiariasEstimadas);
      const sufijoDia = diasRestantes === 1 ? 'día' : 'días';
      return `${stockActual} (aprox. ${Math.max(0, diasRestantes)} ${sufijoDia})`;
    }

    // Medicamento ocasional: mostrar solo la cantidad restante
    return `${stockActual}`;
  };

  const obtenerColorStock = (medicamento) => {
    if (!medicamento || Number(medicamento.stockInicial) <= 0) return '#B0BEC5';
    const stockActual = Number(medicamento.stockActual) || 0;
    if (stockActual <= 0) return '#f44336';
    if (esMedicamentoOcasional(medicamento)) return '#4CAF50';
    let tomasDiariasEstimadas = Math.max(1, Number(medicamento.tomasDiarias) || 1);

    if (medicamento.usarProgramacionPersonalizada && medicamento.programacionPersonalizada) {
      const totalSemanal = Object.values(medicamento.programacionPersonalizada).reduce((total, horarios) => {
        if (!Array.isArray(horarios)) return total;
        return total + horarios.length;
      }, 0);

      if (totalSemanal > 0) {
        tomasDiariasEstimadas = totalSemanal / 7;
      }
    }

    const diasRestantes = Math.floor(stockActual / tomasDiariasEstimadas);
    return diasRestantes <= preferenciasAlerta.diasAntesStock ? '#f44336' : '#4CAF50';
  };

  const estaVencido = (medicamento) => {
    if (!medicamento?.fechaVencimiento) return false;
    const fechaVto = new Date(medicamento.fechaVencimiento);
    if (Number.isNaN(fechaVto.getTime())) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVto.setHours(0, 0, 0, 0);
    return fechaVto < hoy;
  };

  const obtenerEstado = (medicamento) => {
    if (Number(medicamento.stockActual) <= 0) {
      return { clase: 'agotado', texto: 'Agotado!' };
    }
    if (estaVencido(medicamento)) {
      return { clase: 'vencido', texto: 'Vencido' };
    }
    if (medicamento.activo === false) {
      return { clase: 'inactivo', texto: 'Suspendido' };
    }
    return { clase: 'activo', texto: 'Activo' };
  };

  const obtenerResumenProgramacionPersonalizada = (medicamento) => {
    if (!medicamento?.usarProgramacionPersonalizada || !medicamento?.programacionPersonalizada) {
      return null;
    }

    const totalSemanal = Object.values(medicamento.programacionPersonalizada).reduce((total, horarios) => {
      if (!Array.isArray(horarios)) return total;
      return total + horarios.length;
    }, 0);

    const diasConToma = Object.values(medicamento.programacionPersonalizada).filter(
      (horarios) => Array.isArray(horarios) && horarios.length > 0
    ).length;

    const tomasPorDiaActivo = diasConToma > 0
      ? (totalSemanal / diasConToma).toFixed(1)
      : '0.0';

    return {
      totalSemanal,
      diasConToma,
      tomasPorDiaActivo,
    };
  };

  return (
    <div className="botiquin-screen">
      <div className="botiquin-header">
        <button className="btn-home" onClick={() => navigate(esAsistente ? '/botiquin' : '/dashboard')}>🏠</button>
        <h1>{esAsistente ? `Botiquín del Paciente ${nombrePaciente}` : 'Mi Botiquín'}</h1>
        <UserMenu />
      </div>

      <div className="botiquin-content">
        {medicamentos.length === 0 ? (
          <div className="empty-state">
            <p>No hay medicamentos en tu botiquín</p>
            <p className="empty-hint">Agrega tu primer medicamento</p>
          </div>
        ) : (
          <div className="medicamentos-grid">
            {medicamentos.map(medicamento => {
              const estado = obtenerEstado(medicamento);
              const resumenProgramacion = obtenerResumenProgramacionPersonalizada(medicamento);
              const horariosSimples = !resumenProgramacion && Array.isArray(medicamento.horariosTomas)
                ? [...medicamento.horariosTomas].sort((a, b) => a.localeCompare(b))
                : [];
              return (
                <div key={medicamento.id} className="medicamento-card-container">
                {Number(medicamento.stockActual) <= 0 && (
                  <div className="agotado-banner">⚠ Reponer stock</div>
                )}
                <div className="med-card-header">
                  <div className="med-icon-circle" style={{ backgroundColor: medicamento.color }}>
                    <img 
                      src={obtenerIconoPresentacion(medicamento.presentacion)} 
                      alt={medicamento.presentacion || 'medicamento'} 
                      className="med-icon-image"
                    />
                  </div>
                  <div className="med-title-section">
                    <h3 className="med-nombre">{medicamento.nombre}</h3>
                    <div className="badges-row">
                      <span className={`status-badge ${estado.clase}`}>
                        {estado.texto}
                      </span>
                      {medicamento.esCronico && (
                        <span className="status-badge cronico">Crónico</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="med-details">
                  <div className="detail-row">
                    <span className="detail-label">Presentación:</span>
                    <span className="detail-value">{medicamento.presentacion}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tomas diarias:</span>
                    <span className="detail-value">
                      {esMedicamentoOcasional(medicamento) ? (
                        <span style={{ color: '#FF9800', fontWeight: '600' }}>
                          Ocasional
                        </span>
                      ) : resumenProgramacion ? (
                        <span>
                          Personalizada ({resumenProgramacion.totalSemanal}/semana, {resumenProgramacion.tomasPorDiaActivo} por día activo)
                        </span>
                      ) : (
                        medicamento.tomasDiarias
                      )}
                    </span>
                  </div>
                  {!esMedicamentoOcasional(medicamento) && medicamento.tomasDiarias > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Primera toma:</span>
                      <span className="detail-value">
                        {resumenProgramacion
                          ? 'Según programación personalizada'
                          : (horariosSimples[0] || medicamento.primeraToma || 'Sin programar')}
                      </span>
                    </div>
                  )}
                  {!esMedicamentoOcasional(medicamento) && medicamento.tomasDiarias > 1 && !resumenProgramacion && horariosSimples.length > 1 && (
                    <div className="detail-row">
                      <span className="detail-label">Horarios:</span>
                      <span className="detail-value">{horariosSimples.join(' · ')}</span>
                    </div>
                  )}
                  {esMedicamentoOcasional(medicamento) && (
                    <div className="detail-row reminder-badge">
                      <span className="detail-label">💊 Uso:</span>
                      <span className="detail-value" style={{ color: '#FF9800', fontWeight: '600' }}>
                        Ocasional (según necesidad)
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Condición:</span>
                    <span className="detail-value">{medicamento.afeccion}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Vence:</span>
                    <span className="detail-value">{formatearFecha(medicamento.fechaVencimiento)}</span>
                  </div>
                  
                  <div className="stock-row">
                    <span className="detail-label">Stock:</span>
                    <div className="stock-bar-container">
                      <div 
                        className="stock-bar"
                        style={{ 
                          width: `${calcularPorcentajeStock(medicamento)}%`,
                          backgroundColor: obtenerColorStock(medicamento)
                        }}
                      />
                    </div>
                    <span className="stock-text">{obtenerTextoStock(medicamento)}</span>
                  </div>
                  
                  {/* Botón de restar stock para medicamentos ocasionales */}
                  {esMedicamentoOcasional(medicamento) && medicamento.stockActual > 0 && (
                    <div className="stock-actions">
                      <button
                        className="btn-restar-stock"
                        onClick={async () => {
                          const resultado = await restarStock(medicamento.id);
                          if (resultado.success) {
                            showSuccess(`Stock actualizado: ${resultado.stockActual} unidades restantes`);
                          } else {
                            showError(resultado.error || 'Error al restar stock');
                          }
                        }}
                      >
                        <span className="btn-restar-icon">−</span> Restar uno
                      </button>
                    </div>
                  )}
                </div>

                <div className="med-actions">
                  <button 
                    className="btn-editar"
                    onClick={() => navigate(`/nuevo?editar=${medicamento.id}`)}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn-suspender"
                    onClick={async () => {
                      const estaSuspendido = medicamento.activo === false;
                      const accion = estaSuspendido ? 'reactivado' : 'suspendido';
                      const resultado = await suspenderMedicina(medicamento.id);
                      if (resultado.success) {
                        showSuccess(`${medicamento.nombre} ha sido ${accion}`);
                      } else {
                        showError(resultado.error || `Error al ${estaSuspendido ? 'reactivar' : 'suspender'} medicamento`);
                      }
                    }}
                  >
                    {medicamento.activo === false ? 'Reactivar' : 'Suspender'}
                  </button>
                  <button 
                    className="btn-eliminar"
                    onClick={async () => {
                      const confirmado = await showConfirm({
                        title: 'Eliminar medicamento',
                        message: `¿Estás seguro de que deseas eliminar "${medicamento.nombre}"? Esta acción no se puede deshacer.`,
                        confirmText: 'Eliminar',
                        cancelText: 'Cancelar',
                        type: 'danger'
                      });

                      if (confirmado) {
                        const resultado = await eliminarMedicina(medicamento.id);
                        if (resultado.success) {
                          showSuccess(`${medicamento.nombre} ha sido eliminado`);
                        } else {
                          showError(resultado.error || 'Error al eliminar medicamento');
                        }
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <MainMenu />
    </div>
  );
};

export default BotiquinScreen;

