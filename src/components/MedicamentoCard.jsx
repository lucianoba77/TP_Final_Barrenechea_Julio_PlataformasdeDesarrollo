import React from 'react';
import { useMed } from '../context/MedContext';
import { useNotification } from '../context/NotificationContext';
import { obtenerIconoPresentacion } from '../utils/presentacionIcons';
import './MedicamentoCard.css';

const MedicamentoCard = ({ medicamento, tipoVista = 'dashboard' }) => {
  const { marcarToma: marcarTomaContext } = useMed();
  const { showSuccess, showError } = useNotification();

  // Calcular porcentaje de stock
  const porcentajeStock = medicamento.stockInicial > 0
    ? Math.max(0, Math.min(100, (medicamento.stockActual / medicamento.stockInicial) * 100))
    : 0;

  // Obtener las tomas del día actual
  const obtenerTomasHoy = () => {
    const diaHoy = new Date().getDay();
    
    // Si tiene programación personalizada, usar esa
    if (medicamento.usarProgramacionPersonalizada && medicamento.programacionPersonalizada) {
      const horariosHoy = medicamento.programacionPersonalizada[diaHoy] || [];
      return horariosHoy.sort(); // Ordenar horarios
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
      showSuccess(`✅ ${medicamento.nombre} - Toma de las ${horaToma} marcada como tomada`);
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

  return (
    <div className="medicamento-card">
      <div 
        className="card-background"
        style={{
          background: `linear-gradient(135deg, ${medicamento.color} ${porcentajeStock}%, transparent ${porcentajeStock}%)`
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
                disabled={medicamento.stockActual <= 0}
                style={{ 
                  backgroundColor: medicamento.color,
                  opacity: medicamento.stockActual <= 0 ? 0.5 : 1,
                  cursor: medicamento.stockActual <= 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {medicamento.stockActual <= 0 ? 'Sin stock disponible' : '✓ Marcar como tomado'}
              </button>
              <div className="stock-info">
                {medicamento.stockInicial > 0 ? (
                  <>
                    Stock disponible: <strong>{medicamento.stockActual} de {medicamento.diasTratamiento || medicamento.stockInicial}</strong>
                    <br />
                  </>
                ) : (
                  <>
                    <strong>Sin stock disponible</strong>
                    <br />
                  </>
                )}
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

