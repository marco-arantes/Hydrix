import React from 'react';
import type { FilterState, MarkerEvent } from '../types';
import { Filter, MapPin, Download } from 'lucide-react';
import { RightSidebar } from './RightSidebar';

interface SidebarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  markers: MarkerEvent[];
  availableTypes: { id: string, name: string }[];
  showUgrhi4: boolean;
  setShowUgrhi4: React.Dispatch<React.SetStateAction<boolean>>;
  isInsertMode: boolean;
  setIsInsertMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMunicipality: string | null;
  setSelectedMunicipality: React.Dispatch<React.SetStateAction<string | null>>;
  canExport: boolean;
  onExport: (format: 'csv' | 'xlsx') => void;
  activeBacias: string[];
  setActiveBacias: React.Dispatch<React.SetStateAction<string[]>>;
  userRole?: string;
  userMunicipality?: string | null;
  onShowInstitucional?: () => void;
  onShowContato?: () => void;
}

export const Sidebar: React.FC<SidebarProps & {
  mapLayer: 'osm' | 'satellite';
  setMapLayer: React.Dispatch<React.SetStateAction<'osm' | 'satellite'>>;
  showBiomas: boolean;
  setShowBiomas: React.Dispatch<React.SetStateAction<boolean>>;
  showVegetation: boolean;
  setShowVegetation: React.Dispatch<React.SetStateAction<boolean>>;
  showBaciasIbge: boolean;
  setShowBaciasIbge: React.Dispatch<React.SetStateAction<boolean>>;
  showMeso: boolean;
  setShowMeso: React.Dispatch<React.SetStateAction<boolean>>;
  baciaHeatmap: string;
  setBaciaHeatmap: React.Dispatch<React.SetStateAction<string>>;
}> = ({ 
  filter, setFilter, markers, availableTypes, showUgrhi4, setShowUgrhi4, 
  isInsertMode, setIsInsertMode, selectedMunicipality, setSelectedMunicipality,
  mapLayer, setMapLayer, showBiomas, setShowBiomas, showVegetation, setShowVegetation,
  showBaciasIbge, setShowBaciasIbge,
  showMeso, setShowMeso,
  baciaHeatmap, setBaciaHeatmap,
  activeBacias, setActiveBacias,
  userRole, userMunicipality,
  onShowInstitucional, onShowContato,
  canExport, onExport
}) => {
  const [baciaList, setBaciaList] = React.useState<string[]>([]);
  const [baciaSearch, setBaciaSearch] = React.useState('');

  React.useEffect(() => {
    fetch('/bacias_ibge.geojson')
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          const names = data.features.map((f: any) => f.properties?.nome_bacia).filter(Boolean);
          setBaciaList(Array.from(new Set(names)).sort() as string[]);
        }
      })
      .catch(err => console.error('Erro ao carregar lista de bacias:', err));
  }, []);

  const handleAddBacia = (name: string) => {
    if (name && baciaList.includes(name) && !activeBacias.includes(name)) {
      setActiveBacias([...activeBacias, name]);
      setBaciaSearch('');
    }
  };

  const handleRemoveBacia = (name: string) => {
    setActiveBacias(activeBacias.filter(b => b !== name));
  };

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
          {userRole === 'CIDADÃO' ? (
            <input
              type="text"
              id="municipalityFilter"
              value={userMunicipality || ''}
              disabled
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#f1f5f9',
                color: 'var(--text-secondary)',
                cursor: 'not-allowed'
              }}
            />
          ) : (
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
          )}
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
              <option key={type.id} value={type.name}>
                {type.name}
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

        {canExport && (
          <div className="filter-group" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)' }}>
            <label style={{ fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Download size={16} /> Exportar Relatório
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => onExport('csv')}
                style={{ flex: 1, padding: '8px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
              >
                .CSV
              </button>
              <button 
                onClick={() => onExport('xlsx')}
                style={{ flex: 1, padding: '8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
              >
                .XLSX
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.5rem' }}>
              Exporta os eventos de acordo com os filtros aplicados.
            </p>
          </div>
        )}

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

        <div className="filter-group" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)' }}>
          <label style={{ fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Bacias Hidrográficas (IBGE)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showBaciasIbge}
                onChange={(e) => setShowBaciasIbge(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <strong>Mostrar Macrorregiões do Brasil</strong>
            </label>

            {showBaciasIbge && (
              <div style={{ marginLeft: '1.5rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Estilo do Mapa (Heatmap):</label>
                <select
                  value={baciaHeatmap}
                  onChange={(e) => setBaciaHeatmap(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="none">Padrão (Azul transparente)</option>
                  <option value="demanda">Demanda Hídrica Total</option>
                  <option value="populacao">População Estimada (2010)</option>
                </select>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showMeso}
                onChange={(e) => setShowMeso(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <strong>Mostrar Mesorregiões do Brasil</strong>
            </label>
            
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Ou pesquise e ative bacias individualmente:
              </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                list="bacias-list"
                value={baciaSearch}
                onChange={(e) => setBaciaSearch(e.target.value)}
                placeholder="Ex: Bacia do Rio Amazonas"
                style={{ flex: 1, padding: '6px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddBacia(baciaSearch);
                }}
              />
              <datalist id="bacias-list">
                {baciaList.map(bacia => (
                  <option key={bacia} value={bacia} />
                ))}
              </datalist>
              <button 
                onClick={() => handleAddBacia(baciaSearch)}
                className="btn-primary" 
                style={{ padding: '6px 12px' }}
              >
                Adicionar
              </button>
            </div>
            
            {activeBacias.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {activeBacias.map(bacia => (
                  <span key={bacia} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155' }}>
                    {bacia}
                    <button onClick={() => handleRemoveBacia(bacia)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: 0, marginLeft: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Mobile Right Sidebar Placeholder */}
        <div className="mobile-right-sidebar">
          <RightSidebar selectedMunicipality={selectedMunicipality} markers={markers} />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {isInsertMode
              ? "Clique em qualquer lugar no mapa para adicionar um novo registro de evento crítico."
              : "Clique em qualquer lugar no mapa para ver o contorno daquele município."}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
            {onShowInstitucional && (
              <button onClick={onShowInstitucional} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', padding: 0 }}>Institucional</button>
            )}
            {onShowContato && (
              <button onClick={onShowContato} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', padding: 0 }}>Contato</button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
