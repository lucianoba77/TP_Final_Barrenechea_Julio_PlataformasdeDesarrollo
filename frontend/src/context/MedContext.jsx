import React, { createContext, useState, useContext, useEffect } from 'react';
import { puedeAgregarMedicamento } from '../utils/subscription';
import { hasToken } from '../services/apiService';
import { 
  obtenerMedicamentos,
  agregarMedicamento as agregarMedicamentoFirebase,
  actualizarMedicamento,
  eliminarMedicamento as eliminarMedicamentoFirebase,
  marcarTomaRealizada as marcarTomaRealizadaFirebase,
  restarStockMedicamento as restarStockMedicamentoFirebase,
  agregarStockOcasional as agregarStockOcasionalFirebase,
  suscribirMedicamentos
} from '../services/medicamentosService';

const MedContext = createContext();

export const MedProvider = ({ children, usuarioActual }) => {
  if (usuarioActual === undefined) {
    throw new Error('MedProvider requiere la prop usuarioActual. Envuelve con el componente que use useAuth() y pásala.');
  }
  const [medicamentos, setMedicamentos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estabilizar userId para no re-ejecutar el efecto cuando solo cambian otras propiedades (ej. role)
  const userId = usuarioActual
    ? (usuarioActual.role === 'asistente' ? usuarioActual.pacienteId : usuarioActual.id) || usuarioActual.uid
    : null;

  // Cargar medicamentos cuando el usuario se autentica (solo cuando cambia el userId)
  useEffect(() => {
    if (!userId) {
      setMedicamentos([]);
      return undefined;
    }

    if (!hasToken()) {
      const checkToken = setTimeout(() => {
        if (hasToken()) cargarMedicamentos();
      }, 500);
      return () => clearTimeout(checkToken);
    }

    cargarMedicamentos();
    const unsubscribe = suscribirMedicamentos(userId, (medicamentosActualizados) => {
      setMedicamentos(medicamentosActualizados);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const cargarMedicamentos = async () => {
    if (!usuarioActual) return;

    // Si es asistente, cargar medicamentos del paciente; si no, los suyos
    const userIdBase = usuarioActual.role === 'asistente' 
      ? usuarioActual.pacienteId 
      : usuarioActual.id;
    const userId = userIdBase || usuarioActual.uid;

    if (!userId) {
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      const resultado = await obtenerMedicamentos(userId);
      if (resultado.success) {
        setMedicamentos(resultado.medicamentos);
      } else {
        console.error('Error al cargar medicamentos:', resultado.error);
        // Si el error es de conexión, mostrar mensaje más claro
        if (resultado.error && resultado.error.includes('conectar')) {
          console.error('Verifica que el backend esté corriendo en http://localhost:3001');
        }
      }
    } catch (error) {
      console.error('Error al cargar medicamentos:', error);
      // Si no hay medicamentos cargados, mantener array vacío
      if (medicamentos.length === 0) {
        setMedicamentos([]);
      }
    } finally {
      setCargando(false);
    }
  };

  const agregarMedicina = async (medicina, tipoSuscripcion = 'gratis') => {
    if (!usuarioActual) {
      return {
        success: false,
        error: 'Debes estar autenticado para agregar medicamentos'
      };
    }

    // Verificar límite de medicamentos
    if (!puedeAgregarMedicamento(medicamentos.length, tipoSuscripcion)) {
      return {
        success: false,
        error: 'Límite de medicamentos alcanzado. Suscríbete a Premium para agregar más.'
      };
    }

    // Determinar el userId: si es asistente, usar pacienteId; si no, usar su propio id
    // Los pacientes siempre agregan medicamentos para sí mismos
    const userIdBase = usuarioActual.role === 'asistente' 
      ? usuarioActual.pacienteId 
      : usuarioActual.id;
    const userId = userIdBase || usuarioActual.uid;

    if (!userId) {
      return {
        success: false,
        error: 'No se pudo determinar el usuario. Por favor, vuelve a iniciar sesión.'
      };
    }

    // Si Firebase está disponible, usar Firestore
    try {
      const resultado = await agregarMedicamentoFirebase(userId, medicina);
      if (resultado.success) {
        if (resultado.medicamento) {
          setMedicamentos(prev => [...prev, resultado.medicamento]);
        } else {
          // Fallback si backend no devolviera el medicamento completo
          void cargarMedicamentos();
        }
        return resultado;
      }
      return resultado;
    } catch (error) {
      console.error('Error al agregar medicamento:', error);
      return {
        success: false,
        error: error.message || 'Error al agregar medicamento'
      };
    }
  };

  const editarMedicina = async (id, datosActualizados) => {
    try {
      const resultado = await actualizarMedicamento(id, datosActualizados);
      if (resultado.success) {
        // Actualización inmediata para evitar esperar el polling
        setMedicamentos(prev =>
          prev.map(m => (m.id === id ? { ...m, ...datosActualizados } : m))
        );
        // Sincronizar luego con backend por si hay campos derivados
        void cargarMedicamentos();
      }
      return resultado;
    } catch (error) {
      console.error('Error al editar medicamento:', error);
      return {
        success: false,
        error: error.message || 'Error al editar medicamento'
      };
    }
  };

  const eliminarMedicina = async (id) => {
    const snapshot = medicamentos;
    // Optimistic update: quitar de UI antes de esperar backend
    setMedicamentos(prev => prev.filter(m => m.id !== id));
    try {
      const resultado = await eliminarMedicamentoFirebase(id);
      if (!resultado.success) {
        // Rollback si falla en backend
        setMedicamentos(snapshot);
      }
      return resultado;
    } catch (error) {
      // Rollback si falla la petición
      setMedicamentos(snapshot);
      console.error('Error al eliminar medicamento:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar medicamento'
      };
    }
  };

  const suspenderMedicina = async (id) => {
    // Encontrar el medicamento para ver su estado actual
    const medicamento = medicamentos.find(m => m.id === id);
    const nuevoEstado = medicamento?.activo === false ? true : false;
    return await editarMedicina(id, { activo: nuevoEstado });
  };

  const marcarToma = async (id, hora) => {
    const snapshot = medicamentos;
    const fecha = new Date().toISOString().split('T')[0];

    // Optimistic update: reflejar toma y stock de inmediato
    setMedicamentos(prev =>
      prev.map(m => {
        if (m.id !== id) return m;
        const stockActual = Number(m.stockActual) || 0;
        if (stockActual <= 0) return m;

        const yaTomada = (m.tomasRealizadas || []).some(
          toma => toma.fecha === fecha && toma.hora === hora && toma.tomada
        );
        if (yaTomada) return m;

        const tomaOptimista = {
          fecha,
          hora,
          tomada: true,
          timestamp: new Date().toISOString(),
        };

        return {
          ...m,
          tomasRealizadas: [...(m.tomasRealizadas || []), tomaOptimista],
          stockActual: Math.max(0, stockActual - 1),
        };
      })
    );

    try {
      const resultado = await marcarTomaRealizadaFirebase(id, hora);
      if (resultado.success) {
        // Reconciliar con respuesta real del backend
        setMedicamentos(prev =>
          prev.map(m => {
            if (m.id !== id) return m;
            const tomasRealizadas = [...(m.tomasRealizadas || [])];
            if (resultado.toma) tomasRealizadas.push(resultado.toma);
            return {
              ...m,
              tomasRealizadas,
              stockActual: resultado.stockActual !== undefined ? resultado.stockActual : m.stockActual,
            };
          })
        );
      } else {
        // Rollback si backend rechaza la marca
        setMedicamentos(snapshot);
      }
      return resultado;
    } catch (error) {
      setMedicamentos(snapshot);
      console.error('Error al marcar toma:', error);
      return {
        success: false,
        error: error.message || 'Error al marcar toma'
      };
    }
  };

  const restarStock = async (medicamentoId) => {
    const snapshot = medicamentos;
    // Optimistic update: restar stock en UI al instante
    setMedicamentos(prev =>
      prev.map(m => {
        if (m.id !== medicamentoId) return m;
        const stockActual = Number(m.stockActual) || 0;
        return {
          ...m,
          stockActual: Math.max(0, stockActual - 1),
        };
      })
    );

    try {
      const resultado = await restarStockMedicamentoFirebase(medicamentoId);
      if (resultado.success) {
        // Reconciliar con respuesta real
        setMedicamentos(prev =>
          prev.map(m =>
            m.id === medicamentoId
              ? {
                  ...m,
                  stockActual: resultado.stockActual !== undefined ? resultado.stockActual : m.stockActual,
                }
              : m
          )
        );
      } else {
        setMedicamentos(snapshot);
      }
      return resultado;
    } catch (error) {
      setMedicamentos(snapshot);
      console.error('Error al restar stock:', error);
      return {
        success: false,
        error: error.message || 'Error al restar stock'
      };
    }
  };

  const agregarStockOcasional = async (medicamentoId, cantidad, fechaVencimiento) => {
    try {
      const resultado = await agregarStockOcasionalFirebase(medicamentoId, cantidad, fechaVencimiento);
      if (resultado.success) {
        // Sincronizar para reflejar stock y vencimiento actualizados
        void cargarMedicamentos();
      }
      return resultado;
    } catch (error) {
      console.error('Error al agregar stock:', error);
      return {
        success: false,
        error: error.message || 'Error al agregar stock'
      };
    }
  };

  return (
    <MedContext.Provider value={{
      medicamentos,
      agregarMedicina,
      editarMedicina,
      eliminarMedicina,
      suspenderMedicina,
      marcarToma,
      restarStock,
      agregarStockOcasional,
      cargando,
      recargarMedicamentos: cargarMedicamentos
    }}>
      {children}
    </MedContext.Provider>
  );
};

export const useMed = () => {
  const context = useContext(MedContext);
  if (!context) {
    throw new Error('useMed debe ser usado dentro de MedProvider');
  }
  return context;
};

