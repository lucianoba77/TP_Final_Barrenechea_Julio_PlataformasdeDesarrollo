/**
 * Mapeo de presentaciones de medicamentos a sus íconos
 */

import icPills from '../img/ic_pills.png';
import icCapsules from '../img/ic_capsules.png';
import icInjection from '../img/ic_injection.png';
import icSyrup from '../img/ic_syrup.png';
import icDrops from '../img/ic_drops.png';
import icCream from '../img/ic_cream.png';
import icSpray from '../img/ic_spray.png';
import icPatch from '../img/ic_patch.png';
import pomada from '../img/pomada.png';

export const presentacionIcons = {
  comprimidos: icPills,
  capsulas: icCapsules,
  inyeccion: icInjection,
  jarabe: icSyrup,
  gotas: icDrops,
  crema: icCream,
  pomada: pomada,
  spray: icSpray,
  parche: icPatch,
  supositorio: icCream, // Usar crema como fallback
  // Variantes comunes
  'cápsulas': icCapsules,
  'inyección': icInjection,
  'comprimido': icPills,
  'cápsula': icCapsules,
};

/**
 * Obtiene el ícono para una presentación específica
 * @param {string} presentacion - Nombre de la presentación
 * @returns {string} Ruta del ícono
 */
export const obtenerIconoPresentacion = (presentacion) => {
  if (!presentacion) return icPills;
  
  const presentacionLower = presentacion.toLowerCase().trim();
  return presentacionIcons[presentacionLower] || icPills;
};

/**
 * Obtiene el nombre de la presentación formateado
 * @param {string} presentacion - Nombre de la presentación
 * @returns {string} Nombre formateado
 */
export const formatearPresentacion = (presentacion) => {
  if (!presentacion) return 'Comprimidos';
  
  const nombres = {
    comprimidos: 'Comprimidos',
    capsulas: 'Cápsulas',
    inyeccion: 'Inyección',
    jarabe: 'Jarabe',
    gotas: 'Gotas',
    crema: 'Crema',
    pomada: 'Pomada',
    spray: 'Spray',
    parche: 'Parche',
    supositorio: 'Supositorio'
  };
  
  return nombres[presentacion.toLowerCase()] || presentacion;
};

