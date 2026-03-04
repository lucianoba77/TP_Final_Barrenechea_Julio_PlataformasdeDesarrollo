import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMed } from '../context/MedContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { obtenerColorPorIndice } from '../constants/colores';
import { esUsuarioPremium, obtenerMensajeLimite } from '../utils/subscription';
import { obtenerMedicamento } from '../services/medicamentosService';
import UserMenu from '../components/UserMenu';
import MainMenu from '../components/MainMenu';
import ProgramacionPersonalizada from '../components/ProgramacionPersonalizada';
import './NuevaMedicinaScreen.css';

const NuevaMedicinaScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const medicamentoIdEditar = searchParams.get('editar');
  const { agregarMedicina, editarMedicina, medicamentos } = useMed();
  const { usuarioActual } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [cargando, setCargando] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    presentacion: 'comprimidos',
    tomasDiarias: 1,
    primeraToma: '',
    afeccion: '',
    stockInicial: 0,
    color: obtenerColorPorIndice(medicamentos.length),
    diasTratamiento: 0,
    esCronico: false,
    alarmasActivas: true,
    detalles: '',
    fechaVencimiento: '',
    programacionPersonalizada: null,
    usarProgramacionPersonalizada: false
  });
  const [stockReferencia, setStockReferencia] = useState(null);
  const [requiereFechaVencimiento, setRequiereFechaVencimiento] = useState(false);

  // Cargar datos del medicamento si estamos editando
  useEffect(() => {
    const cargarMedicamento = async () => {
      if (medicamentoIdEditar) {
        setCargando(true);
        setEsEdicion(true);
        try {
          const resultado = await obtenerMedicamento(medicamentoIdEditar);
          if (resultado.success && resultado.medicamento) {
            const med = resultado.medicamento;
            setFormData({
              nombre: med.nombre || '',
              presentacion: med.presentacion || 'comprimidos',
              tomasDiarias: med.tomasDiarias || 1,
              primeraToma: med.primeraToma || '',
              afeccion: med.afeccion || '',
              stockInicial: med.stockActual !== undefined && med.stockActual !== null 
                ? med.stockActual 
                : (med.stockInicial || 0),
              color: med.color || obtenerColorPorIndice(medicamentos.length),
              diasTratamiento: med.diasTratamiento || 0,
              esCronico: med.esCronico || false,
              alarmasActivas: med.alarmasActivas !== undefined ? med.alarmasActivas : true,
              detalles: med.detalles || '',
              fechaVencimiento: med.fechaVencimiento || '',
              programacionPersonalizada: med.programacionPersonalizada || null,
              usarProgramacionPersonalizada: !!med.programacionPersonalizada
            });
            setStockReferencia(med.stockActual !== undefined ? Number(med.stockActual) : null);
            setRequiereFechaVencimiento(false);
          } else {
            showError('No se pudo cargar el medicamento para editar');
            navigate('/botiquin');
          }
        } catch (error) {
          console.error('Error al cargar medicamento:', error);
          showError('Error al cargar el medicamento');
          navigate('/botiquin');
        } finally {
          setCargando(false);
        }
      } else {
        // Si no es edición, actualizar el color según el número de medicamentos
        setFormData(prev => ({
          ...prev,
          color: obtenerColorPorIndice(medicamentos.length)
        }));
        setStockReferencia(null);
        setRequiereFechaVencimiento(false);
      }
    };

    cargarMedicamento();
  }, [medicamentoIdEditar, medicamentos.length, navigate, showError]);

  /**
   * Maneja los cambios en los campos del formulario
   * Actualiza el estado del formulario según el tipo de campo (text, checkbox, select, etc.)
   */
  const cambioCampoFormulario = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      let nuevoValor = type === 'checkbox' 
        ? checked 
        : (type === 'number' ? (value === '' ? '' : Number(value)) : value);

      const nuevoEstado = {
        ...prev,
        [name]: nuevoValor
      };

      if (name === 'stockInicial' && esEdicion && stockReferencia !== null) {
        const valorNumerico = Number(nuevoValor) || 0;
        if (valorNumerico > stockReferencia) {
          nuevoEstado.fechaVencimiento = '';
          setRequiereFechaVencimiento(true);
        } else if (valorNumerico === stockReferencia) {
          setRequiereFechaVencimiento(false);
        } else {
          setRequiereFechaVencimiento(false);
        }
      }

      return nuevoEstado;
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.stockInicial < 0) {
      showError('Ingresa un stock inicial válido');
      return;
    }

    if (formData.usarProgramacionPersonalizada) {
      if (!formData.programacionPersonalizada || Object.keys(formData.programacionPersonalizada).length === 0) {
        showError('Debes configurar al menos un día y horario en la programación personalizada');
        return;
      }
      const totalTomas = Object.values(formData.programacionPersonalizada).reduce((sum, horarios) => sum + horarios.length, 0);
      if (totalTomas === 0) {
        showError('Debes configurar al menos un horario en la programación personalizada');
        return;
      }
      if (!formData.esCronico && (!formData.diasTratamiento || formData.diasTratamiento <= 0)) {
        showError('Ingresa la cantidad de días de tratamiento');
        return;
      }
    } else if (formData.tomasDiarias > 0) {
      if (!formData.primeraToma) {
        showError('Debes ingresar la hora de la primera toma');
        return;
      }
      if (!formData.esCronico && (!formData.diasTratamiento || formData.diasTratamiento <= 0)) {
        showError('Ingresa la cantidad de días de tratamiento');
        return;
      }
    }

    // Si tiene stock, debe tener fecha de vencimiento
    if (formData.stockInicial > 0 && !formData.fechaVencimiento) {
      showError('Debes ingresar la fecha de vencimiento del medicamento.');
      return;
    }
    
    if (esEdicion && medicamentoIdEditar) {
      // Modo edición
      const resultado = await editarMedicina(medicamentoIdEditar, formData);
      
      if (resultado.success) {
        showSuccess(`${formData.nombre} ha sido actualizado correctamente`);
        navigate('/botiquin');
      } else {
        showError(resultado.error || 'Error al actualizar medicamento');
      }
    } else {
      // Modo creación
      // Asignar color automáticamente según el orden
      const colorAsignado = obtenerColorPorIndice(medicamentos.length);
      const formDataConColor = {
        ...formData,
        color: colorAsignado
      };
      
      const tipoSuscripcion = esUsuarioPremium(usuarioActual) ? 'premium' : 'gratis';
      const resultado = await agregarMedicina(formDataConColor, tipoSuscripcion);
      
      if (resultado.success) {
        showSuccess(`${formData.nombre} ha sido agregado correctamente`);
        navigate('/botiquin');
      } else {
        showError(resultado.error || 'Error al agregar medicamento');
      }
    }
  };

  // Verificar si puede agregar más medicamentos
  const esPremium = esUsuarioPremium(usuarioActual);
  const puedeAgregar = esPremium || medicamentos.length < 5;
  const mensajeLimite = !esPremium ? obtenerMensajeLimite(medicamentos.length) : '';

  const presentaciones = ['comprimidos', 'inyeccion', 'jarabe', 'gotas', 'crema', 'supositorio'];
  const fechaVencimientoObligatoria = formData.stockInicial > 0 && (!esEdicion || stockReferencia === null || requiereFechaVencimiento);

  return (
    <div className="nueva-medicina-screen">
      <div className="nm-header">
        <button className="btn-back" onClick={() => navigate('/botiquin')}>🏠</button>
        <h1>{esEdicion ? 'Editar Medicina' : 'Nueva Medicina'}</h1>
        <UserMenu />
      </div>

      <div className="nm-container">
        {!esEdicion && !puedeAgregar && (
          <div className="limit-warning">
            <p>⚠️ {mensajeLimite}</p>
            <button 
              className="btn-premium"
              onClick={() => navigate('/ajustes')}
            >
              Suscribirse a Premium
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="nm-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre del medicamento *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={cambioCampoFormulario}
              placeholder="Ej: Paracetamol"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="presentacion">Presentación</label>
            <select
              id="presentacion"
              name="presentacion"
              value={formData.presentacion}
              onChange={cambioCampoFormulario}
            >
              {presentaciones.map(presentacion => (
                <option key={presentacion} value={presentacion}>{presentacion}</option>
              ))}
            </select>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="tomasDiarias">Tomas diarias</label>
              <input
                type="number"
                id="tomasDiarias"
                name="tomasDiarias"
                value={formData.tomasDiarias}
                onChange={cambioCampoFormulario}
                min="0"
                max="6"
                required
                disabled={formData.usarProgramacionPersonalizada}
              />
              <p className="helper-text">
                {formData.tomasDiarias === 0 
                  ? 'Con 0 tomas, el medicamento solo aparecerá en el botiquín. Útil para medicamentos de uso ocasional (ej: analgésicos)'
                  : 'Establece 0 si es un medicamento de uso ocasional que no tomas diariamente'}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="primeraToma">
                Primera toma {formData.tomasDiarias === 0 ? '(opcional)' : '*'}
              </label>
              <input
                type="time"
                id="primeraToma"
                name="primeraToma"
                value={formData.primeraToma}
                onChange={cambioCampoFormulario}
                required={formData.tomasDiarias > 0 && !formData.usarProgramacionPersonalizada}
                disabled={formData.tomasDiarias === 0 || formData.usarProgramacionPersonalizada}
              />
            </div>
          </div>

          {formData.tomasDiarias > 0 && (
            <div className="form-group">
              <div className="toggle-group">
                <label htmlFor="usarProgramacionPersonalizada">Usar programación personalizada</label>
                <input
                  type="checkbox"
                  id="usarProgramacionPersonalizada"
                  name="usarProgramacionPersonalizada"
                  checked={formData.usarProgramacionPersonalizada}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      usarProgramacionPersonalizada: e.target.checked,
                      programacionPersonalizada: e.target.checked ? (prev.programacionPersonalizada || {}) : null,
                      primeraToma: e.target.checked ? '' : prev.primeraToma
                    }));
                  }}
                  className="checkbox-toggle"
                />
              </div>
              <p className="helper-text">
                Activa esta opción para programar tomas en días y horarios específicos de la semana
              </p>
            </div>
          )}

          {formData.usarProgramacionPersonalizada && formData.tomasDiarias > 0 && (
            <ProgramacionPersonalizada
              programacionPersonalizada={formData.programacionPersonalizada}
              onChange={(nuevaProgramacion) => {
                setFormData(prev => ({
                  ...prev,
                  programacionPersonalizada: nuevaProgramacion
                }));
              }}
              diasTratamiento={formData.diasTratamiento}
              esCronico={formData.esCronico}
            />
          )}

          <div className="form-group">
            <label htmlFor="afeccion">Condición que trata</label>
            <input
              type="text"
              id="afeccion"
              name="afeccion"
              value={formData.afeccion}
              onChange={cambioCampoFormulario}
              placeholder="Ej: Dolor de cabeza, Hipertensión"
            />
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="stockInicial">Stock inicial</label>
              <input
                type="number"
                id="stockInicial"
                name="stockInicial"
                value={formData.stockInicial}
                onChange={cambioCampoFormulario}
              min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="diasTratamiento">
                Días de tratamiento {
                  formData.tomasDiarias === 0 
                    ? '(opcional)' 
                    : formData.esCronico 
                      ? '(no aplica - crónico)' 
                      : '*'
                }
              </label>
              <input
                type="number"
                id="diasTratamiento"
                name="diasTratamiento"
                value={formData.diasTratamiento}
                onChange={cambioCampoFormulario}
                min="0"
                required={formData.tomasDiarias > 0 && !formData.esCronico}
                disabled={formData.tomasDiarias === 0 || formData.esCronico}
              />
              {formData.tomasDiarias === 0 && (
                <p className="helper-text">
                  Para medicamentos de uso ocasional, puedes dejar este campo en 0
                </p>
              )}
              {formData.tomasDiarias > 0 && formData.esCronico && (
                <p className="helper-text">
                  Los medicamentos crónicos no tienen fin de tratamiento
                </p>
              )}
              <button
                type="button"
                className="btn-cronico"
                onClick={() => {
                  setFormData(prev => {
                    const nuevoEstado = { ...prev, esCronico: !prev.esCronico };
                    // Si se marca como crónico, limpiar días de tratamiento
                    if (nuevoEstado.esCronico) {
                      nuevoEstado.diasTratamiento = 0;
                    }
                    return nuevoEstado;
                  });
                }}
                disabled={formData.tomasDiarias === 0}
              >
                {formData.esCronico ? 'Crónico ✓' : 'Crónico'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fechaVencimiento">Fecha de vencimiento</label>
            <input
              type="date"
              id="fechaVencimiento"
              name="fechaVencimiento"
              value={formData.fechaVencimiento}
              onChange={cambioCampoFormulario}
              required={fechaVencimientoObligatoria}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="helper-text">
              {formData.stockInicial <= 0
                ? 'Puedes guardar el medicamento sin stock; la fecha es opcional.'
                : requiereFechaVencimiento
                  ? 'Agregaste stock adicional. Ingresa la nueva fecha de vencimiento.'
                  : 'Te avisaremos cuando el medicamento esté próximo a vencer.'}
            </p>
          </div>


          <div className="form-group">
            <div className="toggle-group">
              <label htmlFor="alarmasActivas">Activar alarmas</label>
              <input
                type="checkbox"
                id="alarmasActivas"
                name="alarmasActivas"
                checked={formData.alarmasActivas}
                onChange={cambioCampoFormulario}
                className="checkbox-toggle"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="detalles">Detalles adicionales</label>
            <textarea
              id="detalles"
              name="detalles"
              value={formData.detalles}
              onChange={cambioCampoFormulario}
              rows="4"
              placeholder="Instrucciones especiales, efectos secundarios a vigilar, etc."
            />
          </div>

          <button type="submit" className="btn-submit" disabled={cargando}>
            {cargando ? 'Cargando...' : (esEdicion ? '💾 Guardar Cambios' : '+ Agregar Medicamento')}
          </button>
        </form>
      </div>

      <MainMenu />
    </div>
  );
};

export default NuevaMedicinaScreen;

