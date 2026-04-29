import React, { useState, useEffect } from 'react';
import type { FilterState, MarkerEvent } from '../types';
import { Filter, MapPin, Info, Users, Maximize, Hash, DollarSign, Activity, Globe } from 'lucide-react';
import { getIbgeDataByMunicipalityName, getIbgeMunicipalityStats, getPrefeituraUrl, type IBGEMunicipio, type IBGEStats } from '../utils/ibge';

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
}

export const Sidebar: React.FC<SidebarProps> = ({ filter, setFilter, markers, availableTypes, showUgrhi4, setShowUgrhi4, isInsertMode, setIsInsertMode, selectedMunicipality }) => {
  const [ibgeData, setIbgeData] = useState<IBGEMunicipio | null>(null);
  const [ibgeStats, setIbgeStats] = useState<IBGEStats | null>(null);
  const [loadingIbge, setLoadingIbge] = useState<boolean>(false);

  // Fetch IBGE data when a municipality is selected
  useEffect(() => {
    if (selectedMunicipality) {
      setLoadingIbge(true);
      setIbgeStats(null);
      getIbgeDataByMunicipalityName(selectedMunicipality).then(data => {
        setIbgeData(data);
        if (data) {
          getIbgeMunicipalityStats(data.id).then(stats => {
            setIbgeStats(stats);
            setLoadingIbge(false);
          });
        } else {
          setLoadingIbge(false);
        }
      });
    } else {
      setIbgeData(null);
      setIbgeStats(null);
    }
  }, [selectedMunicipality]);

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

        {/* Informações do Município Selecionado */}
        {selectedMunicipality && (
          <div className="filter-group" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Info size={16} />
              Informações do Local
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedMunicipality}</strong>
              
              {loadingIbge ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Buscando estatísticas oficiais no IBGE...</p>
              ) : ibgeData ? (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {ibgeData.microrregiao.nome} - {ibgeData.microrregiao.mesorregiao.UF.nome} ({ibgeData.microrregiao.mesorregiao.UF.sigla})
                  </p>
                  
                  {ibgeStats?.codigo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <Hash size={14} className="text-blue-500" />
                      <span><strong>Código IBGE:</strong> {ibgeStats.codigo}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <Users size={14} className="text-blue-500" />
                    <span><strong>População{ibgeStats?.populacao ? ` (${ibgeStats.populacao.ano})` : ''}:</strong> {ibgeStats?.populacao ? `${ibgeStats.populacao.valor} hab.` : 'Sem Informação'}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <Maximize size={14} className="text-blue-500" />
                    <span><strong>Área{ibgeStats?.area ? ` (${ibgeStats.area.ano})` : ''}:</strong> {ibgeStats?.area ? `${ibgeStats.area.valor} km²` : 'Sem Informação'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <Activity size={14} className="text-blue-500" />
                    <span><strong>Densidade Dem.{ibgeStats?.densidade ? ` (${ibgeStats.densidade.ano})` : ''}:</strong> {ibgeStats?.densidade ? `${ibgeStats.densidade.valor} hab/km²` : 'Sem Informação'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <DollarSign size={14} className="text-blue-500" />
                    <span><strong>PIB per Capita{ibgeStats?.pibPerCapita ? ` (${ibgeStats.pibPerCapita.ano})` : ''}:</strong> {ibgeStats?.pibPerCapita ? ibgeStats.pibPerCapita.valor : 'Sem Informação'}</span>
                  </div>

                  {/* Subitem Meio Ambiente */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #bae6fd' }}>
                    <h4 style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe size={14} />
                      Meio Ambiente
                    </h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '4px' }}>
                      <span><strong>Área urbanizada{ibgeStats?.areaUrbanizada ? ` (${ibgeStats.areaUrbanizada.ano})` : ''}:</strong> {ibgeStats?.areaUrbanizada ? ibgeStats.areaUrbanizada.valor : 'Sem Informação'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '4px' }}>
                      <span><strong>Esgotamento{ibgeStats?.esgotamentoSanitario ? ` (${ibgeStats.esgotamentoSanitario.ano})` : ''}:</strong> {ibgeStats?.esgotamentoSanitario ? `${ibgeStats.esgotamentoSanitario.valor} adequado` : 'Sem Informação'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '4px' }}>
                      <span><strong>Arborização{ibgeStats?.arborizacao ? ` (${ibgeStats.arborizacao.ano})` : ''}:</strong> {ibgeStats?.arborizacao ? ibgeStats.arborizacao.valor : 'Sem Informação'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '4px' }}>
                      <span><strong>Vias Urbanizadas{ibgeStats?.urbanizacao ? ` (${ibgeStats.urbanizacao.ano})` : ''}:</strong> {ibgeStats?.urbanizacao ? ibgeStats.urbanizacao.valor : 'Sem Informação'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <span><strong>Bioma predominante{ibgeStats?.bioma ? ` (${ibgeStats.bioma.ano})` : ''}:</strong> {ibgeStats?.bioma ? ibgeStats.bioma.valor : 'Sem Informação'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Dados do IBGE não encontrados.</p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a 
                href={getPrefeituraUrl(selectedMunicipality, ibgeData?.microrregiao.mesorregiao.UF.sigla || 'SP')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', fontSize: '0.875rem', padding: '0.5rem', justifyContent: 'center' }}
              >
                <Globe size={14} />
                Site do Município
              </a>
            </div>
          </div>
        )}
        
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
