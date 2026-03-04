import React from 'react';
import { useMed } from '../context/MedContext';
import { useAuth } from '../context/AuthContext';
import { useStockAlerts } from '../hooks/useStockAlerts';
import MedicamentoCard from '../components/MedicamentoCard';
import MainMenu from '../components/MainMenu';
import UserMenu from '../components/UserMenu';
import './DashboardScreen.css';

const DashboardScreen = () => {
  const { medicamentos } = useMed();
  const { usuarioActual } = useAuth();
  
  // Monitorear stock y mostrar alertas
  useStockAlerts(7); // Alertar cuando queden 7 días o menos

  // Filtrar medicamentos del día de hoy
  // Si tiene programación personalizada, verificar si hay tomas para hoy
  // Si no, usar la lógica tradicional con tomasDiarias y primeraToma
  const diaHoy = new Date().getDay(); // 0 = Domingo, 6 = Sábado
  
  const medicamentosHoy = medicamentos.filter(medicamento => {
    if (medicamento.activo === false) return false;
    
    // Si tiene programación personalizada, verificar si hay tomas para el día actual
    if (medicamento.usarProgramacionPersonalizada && medicamento.programacionPersonalizada) {
      const horariosHoy = medicamento.programacionPersonalizada[diaHoy];
      return horariosHoy && horariosHoy.length > 0;
    }
    
    // Si no tiene programación personalizada, usar la lógica tradicional
    return medicamento.tomasDiarias > 0 && medicamento.primeraToma;
  });

  // Ordenar por hora
  // Para programación personalizada, usar la primera hora del día
  // Para programación tradicional, usar primeraToma
  const ordenados = [...medicamentosHoy].sort((medicamentoA, medicamentoB) => {
    let horaA, horaB;
    
    if (medicamentoA.usarProgramacionPersonalizada && medicamentoA.programacionPersonalizada) {
      const horariosHoyA = medicamentoA.programacionPersonalizada[diaHoy] || [];
      horaA = horariosHoyA.length > 0 ? parseInt(horariosHoyA[0].replace(':', '')) : 9999;
    } else {
      horaA = parseInt(medicamentoA.primeraToma.replace(':', ''));
    }
    
    if (medicamentoB.usarProgramacionPersonalizada && medicamentoB.programacionPersonalizada) {
      const horariosHoyB = medicamentoB.programacionPersonalizada[diaHoy] || [];
      horaB = horariosHoyB.length > 0 ? parseInt(horariosHoyB[0].replace(':', '')) : 9999;
    } else {
      horaB = parseInt(medicamentoB.primeraToma.replace(':', ''));
    }
    
    return horaA - horaB;
  });

  return (
    <div className="dashboard-screen">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="greeting">¡Hola, {usuarioActual?.nombre || 'Usuario'}!</h1>
          <p className="sub-greeting">Mantén tu tratamiento al día</p>
        </div>
        <UserMenu />
      </div>

      <div className="dashboard-content">
        <h2 className="section-title">Medicamentos de hoy</h2>
        
        {ordenados.length === 0 ? (
          <div className="empty-state">
            <p>No hay medicamentos programados para hoy</p>
            <p className="empty-hint">Agrega tu primer medicamento</p>
          </div>
        ) : (
          <div className="medicamentos-list">
            {ordenados.map(medicamento => (
              <MedicamentoCard 
                key={medicamento.id} 
                medicamento={medicamento} 
                tipoVista="dashboard"
              />
            ))}
          </div>
        )}
      </div>

      <MainMenu />
    </div>
  );
};

export default DashboardScreen;

