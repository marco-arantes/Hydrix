import React from 'react';
import type { FilterState, MarkerEvent } from '../types';
import { Filter, MapPin } from 'lucide-react';

interface SidebarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  markers: MarkerEvent[];
  showUgrhi4: boolean;
  setShowUgrhi4: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ filter, setFilter, markers, showUgrhi4, setShowUgrhi4 }) => {
  // Extract unique municipalities from the available events
  const uniqueMunicipalities = Array.from(new Set(markers.map(m => m.municipality).filter(Boolean))).sort();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>
          <MapPin size={24} />
          Eventos Críticos
        </h1>
      </div>
      <div className="sidebar-content">
        <div className="filter-group">
          <label>Filtros</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Filter size={16} />
            <span style={{ fontSize: '0.875rem' }}>Refinar exibição</span>
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="municipalityFilter">Município</label>
          <select
            id="municipalityFilter"
            value={filter.municipality}
            onChange={(e) => setFilter({ ...filter, municipality: e.target.value })}
          >
            <option value="">Todos os municípios</option>
            {uniqueMunicipalities.map((mun) => (
              <option key={mun} value={mun}>
                {mun}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="startDate">Data Inicial</label>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              id="startDate"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">Data Final</label>
          <div>
             <input
              type="date"
              id="endDate"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-group" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={showUgrhi4}
              onChange={(e) => setShowUgrhi4(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Mostrar UGRHI-4 (Pardo)
          </label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Exibe o contorno da Bacia do Pardo no mapa.
          </p>
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Clique em qualquer lugar no mapa para adicionar um novo registro de evento crítico.
          </p>
        </div>
      </div>
    </aside>
  );
};
