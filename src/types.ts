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
  'Afundamento do pavimento',
  'Alagamento',
  'Cheia',
  'Deslizamento',
  'Enxurrada',
  'Estiagem',
  'Falta de água',
  'Inundação',
  'Queda de ponte',
  'Seca'
];
