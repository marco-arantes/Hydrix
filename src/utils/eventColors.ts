export interface EventTypeColor {
  bg: string;
  border: string;
  text?: string;
}

// Mapeamento específico e intuitivo para os tipos de eventos conhecidos
export const KNOWN_EVENT_COLORS: Record<string, string> = {
  'Afundamento do Pavimento': '#78350f', // Castanho escuro / asfalto danificado
  'Alagamento': '#0284c7', // Azul água
  'Cheia': '#2563eb', // Azul forte
  'Deslizamento': '#b45309', // Marrom terra / barro
  'Enxurrada': '#0d9488', // Verde azulado torrencial / turbilhonar
  'Estiagem': '#f59e0b', // Amarelo sol forte / seco
  'Falta de Água': '#64748b', // Cinza escuro / torneira seca
  'Inundação': '#1d4ed8', // Azul profundo / transbordamento
  'Queda de Ponte': '#dc2626', // Vermelho alerta
  'Seca': '#ea580c', // Laranja terra árida
};

// Paleta ampla para fallback de novos tipos cadastrados dinamicamente
const PALETTE = [
  '#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a',
  '#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#c026d3',
  '#db2777', '#475569', '#78350f', '#059669', '#4f46e5'
];

export function getEventColor(typeName?: string): string {
  if (!typeName) return '#64748b';
  
  if (KNOWN_EVENT_COLORS[typeName]) {
    return KNOWN_EVENT_COLORS[typeName];
  }

  // Gera uma cor determinística a partir da string caso seja um novo tipo cadastrado
  let hash = 0;
  for (let i = 0; i < typeName.length; i++) {
    hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
