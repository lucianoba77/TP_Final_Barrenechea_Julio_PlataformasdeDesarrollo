import React from 'react';
import { useMed } from '../context/MedContext';
import { useNotification } from '../context/NotificationContext';
import { obtenerIconoPresentacion } from '../utils/presentacionIcons';
import './MedicamentoCard.css';

const ALERT_SETTINGS_KEY = 'alert_settings';
const COLOR_HEX_REGEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

const MedicamentoCard = ({ medicamento, tipoVista = 'dashboard' }) => {
  const { marcarToma: marcarTomaContext } = useMed();
  const { showSuccess, showError, showWarning } = useNotification();

  const obtenerPreferenciasAlerta = () => {
    let notificacionesActivas = true;
    let diasAntesStock = 7;
    try {
      const raw = localStorage.getItem(ALERT_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        notificacionesActivas = parsed?.notificacionesActivas !== false;
        diasAntesStock = Math.max(1, Number(parsed?.diasAntesStock) || 7);
      }
    } catch {
      // Mantener defaults si localStorage no es válido
    }
    return { notificacionesActivas, diasAntesStock };
  };

  const obtenerDiasRestantes = (stockActual) => {
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

    return Math.floor((Number(stockActual) || 0) / tomasDiariasEstimadas);
  };

  // Obtener las tomas del día actual
  const obtenerTomasHoy = () => {
    const diaHoy = new Date().getDay();
    
    // Si tiene programación personalizada, usar esa
    if (medicamento.usarProgramacionPersonalizada && medicamento.programacionPersonalizada) {
      const horariosHoy = medicamento.programacionPersonalizada[diaHoy] || [];
      return horariosHoy.sort(); // Ordenar horarios
    }

    // Si tiene horarios explícitos por día (modo simple), usarlos
    if (Array.isArray(medicamento.horariosTomas) && medicamento.horariosTomas.length > 0) {
      return [...medicamento.horariosTomas].sort((a, b) => a.localeCompare(b));
    }
    
    // Si no, calcular basándose en tomasDiarias y primeraToma
    if (!medicamento.primeraToma || medicamento.tomasDiarias === 0) {
      return [];
    }
    
    const [hora, minuto] = medicamento.primeraToma.split(':');
    const horaPrimeraToma = parseInt(hora) * 60 + parseInt(minuto);
    const intervaloEntreTomas = (24 * 60) / medicamento.tomasDiarias;
    const tomas = [];
    
    for (let i = 0; i < medicamento.tomasDiarias; i++) {
      const horaToma = horaPrimeraToma + (i * intervaloEntreTomas);
      const horasToma = Math.floor(horaToma / 60) % 24;
      const minutosToma = horaToma % 60;
      const horaTomaFormato = `${String(horasToma).padStart(2, '0')}:${String(minutosToma).padStart(2, '0')}`;
      tomas.push(horaTomaFormato);
    }
    
    return tomas;
  };

  const tomasHoy = obtenerTomasHoy();
  const primeraTomaHoy = tomasHoy.length > 0 ? tomasHoy[0] : null;

  // Función para calcular el color de la barra según la hora
  const obtenerColorBarra = (horaToma) => {
    const fechaActual = new Date();
    const horaActual = fechaActual.getHours() * 60 + fechaActual.getMinutes();
    
    const [hora, minuto] = horaToma.split(':');
    const horaTomaMinutos = parseInt(hora) * 60 + parseInt(minuto);
    
    const diferencia = horaActual - horaTomaMinutos;
    
    // Verificar si esta toma específica ya fue tomada
    const fechaHoy = new Date().toISOString().split('T')[0];
    const tomaRealizada = medicamento.tomasRealizadas?.find(
      toma => toma.fecha === fechaHoy && toma.hora === horaToma && toma.tomada
    );
    
    if (tomaRealizada) {
      return '#4CAF50'; // Verde - ya tomada
    }
    
    if (diferencia < -30) {
      return '#FFC107'; // Amarillo - pendiente (aún no)
    } else if (diferencia >= -30 && diferencia <= 30) {
      return '#FF9800'; // Naranja - hora actual
    } else if (diferencia > 30 && diferencia < 240) {
      return '#FF5722'; // Rojo oscuro - pasado reciente
    } else {
      return '#F44336'; // Rojo - pasado
    }
  };

  /**
   * Maneja el evento de marcar una toma como realizada
   * Registra la toma en el historial y actualiza el stock del medicamento
   */
  const marcarToma = async (horaToma) => {
    const resultado = await marcarTomaContext(medicamento.id, horaToma);
    if (resultado.success) {
      // Alerta inmediata al marcar toma (según configuración de Ajustes)
      const { notificacionesActivas, diasAntesStock } = obtenerPreferenciasAlerta();
      let mostroToast = false;

      const stockActualBackend = Number(resultado.stockActual);
      const stockActual = Number.isFinite(stockActualBackend)
        ? stockActualBackend
        : Math.max(0, (Number(medicamento.stockActual) || 0) - 1);
      if (notificacionesActivas && Number.isFinite(stockActual)) {
        const diasRestantes = obtenerDiasRestantes(stockActual);
        if (stockActual <= 0) {
          showError(`⚠️ ${medicamento.nombre} se ha agotado. Por favor, recarga tu stock.`, 5000);
          mostroToast = true;
        } else if (diasRestantes <= diasAntesStock) {
          const sufijoToma = stockActual === 1 ? 'toma' : 'tomas';
          const sufijoDia = diasRestantes === 1 ? 'día' : 'días';
          showWarning(
            `⚠️ ${medicamento.nombre}: stock para ${stockActual} ${sufijoToma} (aprox. ${diasRestantes} ${sufijoDia}).`,
            6000
          );
          mostroToast = true;
        }
      }

      // Mostrar éxito solo cuando no hay alerta de bajo stock/agotado
      if (!mostroToast) {
        showSuccess(`✅ ${medicamento.nombre} - Toma de las ${horaToma} marcada como tomada`);
      }
    } else {
      showError(resultado.error || 'Error al marcar la toma');
    }
  };

  // Obtener ícono según presentación
  const obtenerIcono = () => {
    return obtenerIconoPresentacion(medicamento.presentacion);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin registrar';
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return 'Sin registrar';
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const estaVencido = () => {
    if (!medicamento?.fechaVencimiento) return false;
    const fechaVto = new Date(medicamento.fechaVencimiento);
    if (Number.isNaN(fechaVto.getTime())) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVto.setHours(0, 0, 0, 0);
    return fechaVto < hoy;
  };

  const medicamentoVencido = estaVencido();
  const estaDeshabilitado = medicamento.stockActual <= 0 || medicamentoVencido;

  const obtenerColorTextoContraste = (colorHex) => {
    const color = String(colorHex || '').trim();
    if (!COLOR_HEX_REGEX.test(color)) return '#111';

    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminancia = (0.299 * r) + (0.587 * g) + (0.114 * b);

    return luminancia > 160 ? '#111' : '#fff';
  };

  const renderStockInfo = () => {
    const stockActual = Number(medicamento.stockActual) || 0;
    const tomasDiarias = Number(medicamento.tomasDiarias) || 0;

    if (Number(medicamento.stockInicial) <= 0) {
      return (
        <>
          <strong>Sin stock disponible</strong>
          <br />
        </>
      );
    }

    if (tomasDiarias > 0) {
      const diasRestantes = obtenerDiasRestantes(stockActual);
      const sufijoDia = diasRestantes === 1 ? 'día' : 'días';
      return (
        <>
          Stock disponible: <strong>{stockActual} unidad{stockActual !== 1 ? 'es' : ''}</strong>
          <br />
          Aproximadamente <strong>{Math.max(0, diasRestantes)} {sufijoDia}</strong> de medicación
          <br />
        </>
      );
    }

    return (
      <>
        Stock disponible: <strong>{stockActual} unidad{stockActual !== 1 ? 'es' : ''}</strong>
        <br />
      </>
    );
  };

  return (
    <div className="medicamento-card">
      <div 
        className="card-background"
        style={{
          borderColor: medicamento.color,
          backgroundColor: `${medicamento.color}1A`
        }}
      >
        <div className="card-content">
          <div className="med-header">
            <div 
              className="med-icon"
              style={{ backgroundColor: medicamento.color }}
            >
              <img 
                src={obtenerIcono()} 
                alt={medicamento.presentacion || 'medicamento'} 
                className="med-icon-image"
              />
            </div>
            <div className="med-info">
              <h3 className="med-nombre">{medicamento.nombre}</h3>
              <span className="med-tomas-count">
                {tomasHoy.length} toma{tomasHoy.length !== 1 ? 's' : ''} hoy
              </span>
            </div>
            {primeraTomaHoy && (
              <div className="med-hora">
                🕐 {primeraTomaHoy}
              </div>
            )}
          </div>

          <div className="tomas-barras">
            {tomasHoy.map((horaToma, index) => (
              <div key={`${horaToma}-${index}`} className="toma-item">
                <span className="toma-label">Toma #{index + 1} - {horaToma}</span>
                <div 
                  className="toma-barra"
                  style={{ 
                    backgroundColor: obtenerColorBarra(horaToma),
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
            ))}
          </div>

          {tipoVista === 'dashboard' && (
            <>
              <button 
                className="btn-marcar"
                onClick={() => {
                  // Encontrar la próxima toma pendiente
                  const fechaHoy = new Date().toISOString().split('T')[0];
                  let proximaTomaPendiente = null;
                  
                  for (const horaToma of tomasHoy) {
                    const yaTomada = medicamento.tomasRealizadas?.find(
                      toma => toma.fecha === fechaHoy && toma.hora === horaToma && toma.tomada
                    );
                    
                    if (!yaTomada) {
                      proximaTomaPendiente = horaToma;
                      break;
                    }
                  }
                  
                  if (proximaTomaPendiente) {
                    marcarToma(proximaTomaPendiente);
                  } else {
                    showSuccess(`✅ Todas las tomas de ${medicamento.nombre} ya fueron marcadas hoy`);
                  }
                }}
                disabled={estaDeshabilitado}
                style={{ 
                  backgroundColor: estaDeshabilitado ? '#ECEFF1' : medicamento.color,
                  color: estaDeshabilitado ? '#111' : obtenerColorTextoContraste(medicamento.color),
                  cursor: estaDeshabilitado ? 'not-allowed' : 'pointer'
                }}
              >
                {medicamentoVencido
                  ? 'Medicamento vencido'
                  : (medicamento.stockActual <= 0 ? 'Sin stock disponible' : '✓ Marcar como tomado')}
              </button>

              {medicamentoVencido && (
                <div className="expired-warning-message">
                  Medicamento Vencido - Debe reponer esta medicación
                </div>
              )}

              <div className="stock-info">
                {renderStockInfo()}
                Vence: <strong>{formatearFecha(medicamento.fechaVencimiento)}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicamentoCard;

