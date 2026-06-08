export type UserRole = 'ADMIN' | 'GESTOR' | 'CIDADÃO';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  municipality?: string;
}

export interface MarkerEvent {
  id: string;
  type: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  observation: string;
  municipality: string;
  lat: number;
  lng: number;
  user_id?: string;
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
