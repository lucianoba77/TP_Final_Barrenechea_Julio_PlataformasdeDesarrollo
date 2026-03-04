/**
 * Colores pasteles disponibles para medicamentos (5 colores)
 * Se asignan automáticamente en orden cíclico
 */
export const coloresMedicamento = [
  { nombre: 'Rosa pastel', valor: '#FFB6C1' },
  { nombre: 'Azul pastel', valor: '#ADD8E6' },
  { nombre: 'Verde pastel', valor: '#B0E0E6' },
  { nombre: 'Amarillo pastel', valor: '#FFFACD' },
  { nombre: 'Lavanda pastel', valor: '#E6E6FA' }
];

/**
 * Obtiene el color para un medicamento según su índice
 * Los colores se asignan en orden cíclico (1-5, luego se repiten)
 */
export const obtenerColorPorIndice = (indice) => {
  const indiceColor = indice % coloresMedicamento.length;
  return coloresMedicamento[indiceColor].valor;
};

