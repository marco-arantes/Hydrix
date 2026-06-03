import React from 'react';
import type { FilterState, MarkerEvent } from '../types';
import { Filter, MapPin } from 'lucide-react';

interface SidebarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  markers: MarkerEvent[];
  availableTypes: string[];
  showUgrhi4: boolean;
  setShowUgrhi4: React.Dispatch<React.SetStateAction<boolean>>;
  isInsertMode: boolean;
  setIsInsertMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMunicipality: string | null;
  setSelectedMunicipality: React.Dispatch<React.SetStateAction<string | null>>;
}

export const Sidebar: React.FC<SidebarProps & {
  mapLayer: 'osm' | 'satellite';
  setMapLayer: React.Dispatch<React.SetStateAction<'osm' | 'satellite'>>;
  showBiomas: boolean;
  setShowBiomas: React.Dispatch<React.SetStateAction<boolean>>;
  showVegetation: boolean;
  setShowVegetation: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ 
  filter, setFilter, markers, availableTypes, showUgrhi4, setShowUgrhi4, 
  isInsertMode, setIsInsertMode, selectedMunicipality, setSelectedMunicipality,
  mapLayer, setMapLayer, showBiomas, setShowBiomas, showVegetation, setShowVegetation
}) => {
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
            onChange={(e) => {
              setFilter({ ...filter, municipality: e.target.value });
              setSelectedMunicipality(e.target.value || null);
            }}
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
          <label htmlFor="eventTypeFilter">Tipo de Evento</label>
          <select
            id="eventTypeFilter"
            value={filter.eventType}
            onChange={(e) => setFilter({ ...filter, eventType: e.target.value })}
          >
            <option value="">Todos os tipos</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
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

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, marginTop: '1rem' }}>
            <input
              type="checkbox"
              checked={isInsertMode}
              onChange={(e) => setIsInsertMode(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Inserir Eventos
          </label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Se ativado, clicar no mapa cria um evento. Se desativado, clicar mostra o contorno do município.
          </p>
        </div>

        <div className="filter-group" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: 'var(--radius-md)' }}>
          <label style={{ fontWeight: 600, color: '#0369a1', display: 'block', marginBottom: '0.5rem' }}>Mapa de Fundo</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                name="mapLayer"
                value="osm"
                checked={mapLayer === 'osm'}
                onChange={() => setMapLayer('osm')}
                style={{ width: 'auto' }}
              />
              OpenStreetMap (Ruas)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                name="mapLayer"
                value="satellite"
                checked={mapLayer === 'satellite'}
                onChange={() => setMapLayer('satellite')}
                style={{ width: 'auto' }}
              />
              Satélite (Esri)
            </label>
          </div>

          <label style={{ fontWeight: 600, color: '#0369a1', display: 'block', marginTop: '1rem', marginBottom: '0.5rem' }}>Camadas IBGE / INDE</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={showBiomas}
                onChange={(e) => setShowBiomas(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Biomas
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={showVegetation}
                onChange={(e) => setShowVegetation(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Vegetação
            </label>
          </div>
        </div>


        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {isInsertMode
              ? "Clique em qualquer lugar no mapa para adicionar um novo registro de evento crítico."
              : "Clique em qualquer lugar no mapa para ver o contorno daquele município."}
          </p>
        </div>
      </div>
    </aside>
  );
};
