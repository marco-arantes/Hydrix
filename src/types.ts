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
  startDate: string;
  endDate: string;
}

export const INITIAL_TYPES = ['Alagamento', 'Falta de água'];
