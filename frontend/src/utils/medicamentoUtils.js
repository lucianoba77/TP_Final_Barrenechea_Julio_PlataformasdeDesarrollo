export const esMedicamentoOcasional = (medicamento) => {
  if (!medicamento) return false;

  const diasTratamiento = Number(medicamento.diasTratamiento) || 0;
  const esCronico = medicamento.esCronico === true;
  const tomasDiarias = Number(medicamento.tomasDiarias) || 0;

  // Regla principal solicitada por negocio:
  // diasTratamiento = 0 y no crónico => ocasional.
  // Se mantiene compatibilidad con datos viejos donde se usaba tomasDiarias = 0.
  return (!esCronico && diasTratamiento === 0) || tomasDiarias === 0;
};
