export interface MarkerEvent {
  id: string;
  type: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  observation: string;
  municipality: string;
  lat: number;
  lng: number;
}

export interface FilterState {
  municipality: string;
  eventType: string;
  startDate: string;
  endDate: string;
}

export const INITIAL_TYPES = [
  'Afundamento do Pavimento',
  'Alagamento',
  'Cheia',
  'Deslizamento',
  'Enxurrada',
  'Estiagem',
  'Falta de Água',
  'Inundação',
  'Queda de Ponte',
  'Seca'
];
