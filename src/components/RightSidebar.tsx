import React, { useState, useEffect } from 'react';
import { Info, Users, Maximize, Hash, DollarSign, Activity, Globe } from 'lucide-react';
import { getIbgeDataByMunicipalityName, getIbgeMunicipalityStats, getPrefeituraUrl, type IBGEMunicipio, type IBGEStats } from '../utils/ibge';
import type { MarkerEvent } from '../types';

interface RightSidebarProps {
  selectedMunicipality: string | null;
  markers: MarkerEvent[];
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ selectedMunicipality, markers }) => {
  const [ibgeData, setIbgeData] = useState<IBGEMunicipio | null>(null);
  const [ibgeStats, setIbgeStats] = useState<IBGEStats | null>(null);
  const [loadingIbge, setLoadingIbge] = useState<boolean>(false);

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

  const municipalityEvents = React.useMemo(() => {
    if (!selectedMunicipality) return [];
    return markers.filter(m => {
      const normMarker = m.municipality ? m.municipality.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
      const normSelected = selectedMunicipality.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      return normMarker.includes(normSelected) || normSelected.includes(normMarker);
    });
  }, [markers, selectedMunicipality]);

  const eventsByType = React.useMemo(() => {
    return municipalityEvents.reduce((acc, marker) => {
      const type = marker.event_type_name || 'Desconhecido';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [municipalityEvents]);

  if (!selectedMunicipality) {
    return (
      <aside className="sidebar right-sidebar">
        <div className="sidebar-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={24} />
            Informações do Local
          </h3>
        </div>
        <div className="sidebar-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Selecione um município no mapa para ver suas informações detalhadas.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar right-sidebar">
      <div className="sidebar-header">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={24} />
          Informações do Local
        </h3>
      </div>
      <div className="sidebar-content">
        <div className="filter-group" style={{ padding: '1rem', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 'var(--radius-md)' }}>
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
                  <Users size={14} className="text-blue-500" />
                  <span><strong>População estimada{ibgeStats?.populacaoEstimada ? ` (${ibgeStats.populacaoEstimada.ano})` : ''}:</strong> {ibgeStats?.populacaoEstimada ? `${ibgeStats.populacaoEstimada.valor} hab.` : 'Sem Informação'}</span>
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

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #bae6fd' }}>
            <h4 style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={14} />
              Eventos no Município
            </h4>
            {Object.keys(eventsByType).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {Object.entries(eventsByType)
                  .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
                  .map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    <span>{type}</span>
                    <span style={{ fontWeight: 'bold', backgroundColor: '#bfdbfe', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nenhum evento registrado.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
