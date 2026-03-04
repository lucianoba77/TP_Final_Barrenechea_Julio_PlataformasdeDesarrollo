import { useEffect, useRef } from 'react';
import { useMed } from '../context/MedContext';
import { useNotification } from '../context/NotificationContext';
import { esMedicamentoOcasional } from '../utils/medicamentoUtils';

/**
 * Hook para monitorear el stock de medicamentos y mostrar alertas
 */
export const useStockAlerts = (
  diasAntesAlerta = 7,
  notificacionesActivas = true,
  medicamentosParaAlertas = null
) => {
  const { medicamentos } = useMed();
  const { showWarning, showError } = useNotification();
  const ultimoStockRef = useRef(new Map());
  const agotadosAlertadosRef = useRef(new Set());
  const vencidosAlertadosRef = useRef(new Set());
  const vencimientoRiesgoAlertadoRef = useRef(new Set());
  const medicamentosObjetivo = Array.isArray(medicamentosParaAlertas)
    ? medicamentosParaAlertas
    : medicamentos;

  const calcularDiasHastaVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const vto = new Date(fechaVencimiento);
    if (Number.isNaN(vto.getTime())) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    vto.setHours(0, 0, 0, 0);
    const msPorDia = 1000 * 60 * 60 * 24;
    return Math.floor((vto.getTime() - hoy.getTime()) / msPorDia);
  };

  const obtenerTomasDiariasEstimadas = (medicamento) => {
    if (medicamento?.usarProgramacionPersonalizada && medicamento?.programacionPersonalizada) {
      const totalSemanal = Object.values(medicamento.programacionPersonalizada).reduce((total, horarios) => {
        if (!Array.isArray(horarios)) return total;
        return total + horarios.length;
      }, 0);

      if (totalSemanal > 0) {
        return totalSemanal / 7;
      }
    }

    return Math.max(1, Number(medicamento?.tomasDiarias) || 1);
  };

  useEffect(() => {
    if (!notificacionesActivas) return;
    if (!medicamentosObjetivo || medicamentosObjetivo.length === 0) return;

    medicamentosObjetivo.forEach(medicamento => {
      // Considerar activo por defecto cuando el campo no existe (compatibilidad datos viejos)
      if (medicamento.activo === false) return;
      if (esMedicamentoOcasional(medicamento)) return;

      const medicamentoId = medicamento.id;
      const stockActual = Number(medicamento.stockActual) || 0;
      const tomasDiariasEstimadas = obtenerTomasDiariasEstimadas(medicamento);
      const diasRestantes = Math.floor(stockActual / tomasDiariasEstimadas);
      const ultimoStock = ultimoStockRef.current.get(medicamentoId);
      const diasHastaVencimiento = calcularDiasHastaVencimiento(medicamento.fechaVencimiento);
      const vencido = typeof diasHastaVencimiento === 'number' && diasHastaVencimiento < 0;
      const venceAntesDeAcabarStock =
        typeof diasHastaVencimiento === 'number' &&
        diasHastaVencimiento >= 0 &&
        stockActual > 0 &&
        diasRestantes > diasHastaVencimiento;

      if (vencido) {
        if (!vencidosAlertadosRef.current.has(medicamentoId)) {
          showError(`⚠️ ${medicamento.nombre}: medicamento vencido. Debe reponer esta medicación.`, 6000);
          vencidosAlertadosRef.current.add(medicamentoId);
        }
        ultimoStockRef.current.set(medicamentoId, stockActual);
        return;
      }

      vencidosAlertadosRef.current.delete(medicamentoId);

      if (venceAntesDeAcabarStock) {
        const claveRiesgo = `${medicamentoId}-${diasHastaVencimiento}-${diasRestantes}`;
        if (!vencimientoRiesgoAlertadoRef.current.has(claveRiesgo)) {
          const sufijoVenc = diasHastaVencimiento === 1 ? 'día' : 'días';
          const sufijoStock = diasRestantes === 1 ? 'día' : 'días';
          showWarning(
            `⚠️ ${medicamento.nombre}: vence en ${diasHastaVencimiento} ${sufijoVenc} y tu stock alcanza para ${diasRestantes} ${sufijoStock}.`,
            6500
          );
          vencimientoRiesgoAlertadoRef.current.add(claveRiesgo);
        }
      }

      if (stockActual <= 0) {
        // Alertar una vez al agotarse (o al primer render si ya está agotado)
        if (!agotadosAlertadosRef.current.has(medicamentoId)) {
          showError(
            `⚠️ ${medicamento.nombre} se ha agotado. Por favor, recarga tu stock.`,
            5000
          );
          agotadosAlertadosRef.current.add(medicamentoId);
        }
      } else {
        // Si recupera stock, permitir futura alerta de agotado
        agotadosAlertadosRef.current.delete(medicamentoId);

        // Mostrar alerta al entrar en umbral por primera vez.
        // Las alertas inmediatas por cada toma se muestran en MedicamentoCard para evitar duplicados.
        const entroEnUmbral = typeof ultimoStock !== 'number' && diasRestantes <= diasAntesAlerta;

        if (entroEnUmbral) {
          if (diasRestantes <= 1) {
            showWarning(
              `⚠️ ${medicamento.nombre}: queda stock para ${Math.max(0, diasRestantes)} día. Reponer cuanto antes.`,
              6000
            );
          } else {
            showWarning(
              `⚠️ ${medicamento.nombre}: quedan aproximadamente ${diasRestantes} días de stock.`,
              5000
            );
          }
        }
      }

      ultimoStockRef.current.set(medicamentoId, stockActual);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicamentosObjetivo, diasAntesAlerta, notificacionesActivas]);

  // Limpiar referencias cuando cambian los medicamentos
  useEffect(() => {
    if (!notificacionesActivas) {
      ultimoStockRef.current.clear();
      agotadosAlertadosRef.current.clear();
      vencidosAlertadosRef.current.clear();
      vencimientoRiesgoAlertadoRef.current.clear();
      return;
    }

    const medicamentoIds = new Set((medicamentosObjetivo || []).map(m => m.id));
    ultimoStockRef.current.forEach((_, medicamentoId) => {
      if (!medicamentoIds.has(medicamentoId)) {
        ultimoStockRef.current.delete(medicamentoId);
      }
    });
    agotadosAlertadosRef.current.forEach(medicamentoId => {
      if (!medicamentoIds.has(medicamentoId)) {
        agotadosAlertadosRef.current.delete(medicamentoId);
      }
    });
    vencidosAlertadosRef.current.forEach(medicamentoId => {
      if (!medicamentoIds.has(medicamentoId)) {
        vencidosAlertadosRef.current.delete(medicamentoId);
      }
    });
    vencimientoRiesgoAlertadoRef.current.forEach(clave => {
      const medicamentoId = clave.split('-')[0];
      if (!medicamentoIds.has(medicamentoId)) {
        vencimientoRiesgoAlertadoRef.current.delete(clave);
      }
    });
  }, [medicamentosObjetivo, notificacionesActivas]);
};

