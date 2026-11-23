import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON, WMSTileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { MarkerEvent, EventSeverity, EventStatus } from '../types';
import { fetchMunicipality } from '../utils/reverseGeocode';
import { getIbgeDataByMunicipalityName } from '../utils/ibge';
import { getEventColor } from '../utils/eventColors';

// Fix for leaflet internal icon missing issues in some environments
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Função geradora de ícones SVG personalizados coloridos por tipo de evento
export function createCustomMarkerIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="1.8" 
            filter="url(#shadow)"/>
      <circle cx="12" cy="11.5" r="4.5" fill="#ffffff" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-color-marker',
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -38]
  });
}

interface MapAreaProps {
  markers: MarkerEvent[];
  availableTypes?: { id: string, name: string }[];
  onMapClick: (lat: number, lng: number) => void;
  showUgrhi4: boolean;
  isInsertMode: boolean;
  selectedMunicipality: string | null;
  setSelectedMunicipality: React.Dispatch<React.SetStateAction<string | null>>;
  mapLayer: 'osm' | 'satellite';
  showBiomas: boolean;
  showVegetation: boolean;
  showBaciasIbge?: boolean;
  showMeso: boolean;
  baciaHeatmap: string;
  activeBacias: string[];
  onDeleteMarker?: (id: string) => void;
  onUpdateSeverity?: (id: string, severity: EventSeverity) => Promise<void>;
  onUpdateStatus?: (id: string, status: EventStatus) => Promise<void>;
  lockedCityPath?: string | null;
}

const MapEvents: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const normalizeCitySlug = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const MapLocker: React.FC<{ lockedPath: string, onFound: (name: string, geojson: any) => void }> = ({ lockedPath, onFound }) => {
  const map = useMapEvents({});
  const processedPathRef = useRef<string | null>(null);
  const onFoundRef = useRef(onFound);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  useEffect(() => {
    if (!lockedPath || processedPathRef.current === lockedPath) return;

    let isMounted = true;
    const targetSlug = normalizeCitySlug(lockedPath);

    const fetchCity = async () => {
      try {
        // 1. Official IBGE API lookup for SP municipalities
        const ibgeListRes = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios');
        if (ibgeListRes.ok) {
          const ibgeList = await ibgeListRes.json();
          const foundMuni = ibgeList.find((m: any) => normalizeCitySlug(m.nome) === targetSlug);

          if (foundMuni) {
            // Fetch municipality vector boundaries from IBGE Malhas API
            const geoRes = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${foundMuni.id}?formato=application/vnd.geo+json`);
            if (geoRes.ok) {
              const geoJson = await geoRes.json();
              if (isMounted) {
                const layer = L.geoJSON(geoJson);
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                  processedPathRef.current = lockedPath;
                  map.fitBounds(bounds, { padding: [20, 20] });
                  map.setMaxBounds(bounds.pad(0.1));
                  map.setMinZoom(map.getBoundsZoom(bounds) - 1);
                  onFoundRef.current(foundMuni.nome, geoJson);
                  return;
                }
              }
            }
          }
        }

        // 2. Fallback to Nominatim OSM if not in SP or IBGE unavailable
        const searchString = lockedPath.replace(/-/g, ' ');
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchString + ', São Paulo, Brazil')}&format=json&polygon_geojson=1`;
        const nomRes = await fetch(nomUrl, {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
          }
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (nomData && nomData.length > 0 && isMounted) {
            const item = nomData.find((d: any) => d.type === 'administrative' && d.class === 'boundary') || nomData[0];
            if (item && item.boundingbox) {
              const bb = item.boundingbox;
              const bounds = L.latLngBounds(
                L.latLng(parseFloat(bb[0]), parseFloat(bb[2])),
                L.latLng(parseFloat(bb[1]), parseFloat(bb[3]))
              );
              if (bounds.isValid()) {
                processedPathRef.current = lockedPath;
                map.fitBounds(bounds, { padding: [20, 20] });
                map.setMaxBounds(bounds.pad(0.1));
                map.setMinZoom(map.getBoundsZoom(bounds) - 1);
                onFoundRef.current(item.display_name.split(',')[0].trim(), item.geojson);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in MapLocker lookup:", err);
      }
    };

    fetchCity();

    return () => {
      isMounted = false;
    };
  }, [lockedPath, map]);
  return null;
};

export const MapArea: React.FC<MapAreaProps> = ({
  markers, availableTypes, onMapClick, showUgrhi4, isInsertMode,
  selectedMunicipality, setSelectedMunicipality,
  mapLayer, showBiomas, showVegetation, showBaciasIbge, showMeso, baciaHeatmap, activeBacias, onDeleteMarker, onUpdateSeverity, onUpdateStatus, lockedCityPath
}) => {
  // Centro aproximado da Bacia do Pardo (UGRHI-4), perto de Ribeirão Preto
  const defaultCenter: [number, number] = [-21.1, -47.8];
  const zoomLevel = 8;

  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Tipos para a legenda (ou do banco ou únicos dos marcadores presentes)
  const legendTypes = useMemo(() => {
    if (availableTypes && availableTypes.length > 0) {
      return availableTypes.map(t => t.name).sort((a, b) => a.localeCompare(b));
    }
    const setOfTypes = new Set<string>();
    markers.forEach(m => {
      if (m.event_type_name) setOfTypes.add(m.event_type_name);
    });
    return Array.from(setOfTypes).sort((a, b) => a.localeCompare(b));
  }, [availableTypes, markers]);

  const fetched = useRef(new Set<string>());
  const [boundaries, setBoundaries] = useState<Record<string, any>>({});
  const [ugrhiGeoJson, setUgrhiGeoJson] = useState<any>(null);
  const [baciasIbgeGeoJson, setBaciasIbgeGeoJson] = useState<any>(null);
  const [mesoGeoJson, setMesoGeoJson] = useState<any>(null);
  const [editingSeverities, setEditingSeverities] = useState<Record<string, EventSeverity>>({});
  const [savingSeverityId, setSavingSeverityId] = useState<string | null>(null);
  const [editingStatuses, setEditingStatuses] = useState<Record<string, EventStatus>>({});
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (showUgrhi4 && !ugrhiGeoJson) {
      fetch('/ugrhi4.geojson')
        .then(res => res.json())
        .then(data => setUgrhiGeoJson(data))
        .catch(err => console.error('Erro ao carregar UGRHI-4:', err));
    }
  }, [showUgrhi4, ugrhiGeoJson]);

  useEffect(() => {
    if ((showBaciasIbge || activeBacias.length > 0) && !baciasIbgeGeoJson) {
      fetch('/bacias_ibge.geojson')
        .then(res => res.json())
        .then(data => setBaciasIbgeGeoJson(data))
        .catch(err => console.error('Erro ao carregar Bacias IBGE:', err));
    }
  }, [showBaciasIbge, activeBacias, baciasIbgeGeoJson]);

  useEffect(() => {
    if (showMeso && !mesoGeoJson) {
      fetch('/mesorregioes_ibge.geojson')
        .then(res => res.json())
        .then(data => setMesoGeoJson(data))
        .catch(err => console.error('Erro ao carregar Mesorregiões:', err));
    }
  }, [showMeso, mesoGeoJson]);

  useEffect(() => {
    let active = true;

    const fetchBoundaries = async () => {
      const uniqueMunicipalities = Array.from(new Set(markers.map(m => m.municipality).filter(Boolean)));

      for (const mun of uniqueMunicipalities) {
        if (!active) break;
        if (fetched.current.has(mun)) continue;

        fetched.current.add(mun); // mark as fetched or in-progress

        try {
          const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(mun)}&country=Brazil&format=json&polygon_geojson=1`;
          const res = await fetch(url, {
            headers: {
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
            }
          });
          const data = await res.json();

          if (active && data && data.length > 0 && data[0].geojson) {
            setBoundaries(prev => ({
              ...prev,
              [mun]: data[0].geojson
            }));
          }
        } catch (e) {
          console.error("Error fetching boundary for", mun, e);
        }

        // Wait 1.5s to respect Nominatim limits and allow clicks to pass through
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    };

    fetchBoundaries();
    return () => { active = false; };
  }, [markers]);

  const getHeatmapStyle = (feature: any) => {
    if (baciaHeatmap === 'demanda') {
      const val = feature.properties.dem_total || 0;
      let color = '#fef08a';
      if (val > 500) color = '#b91c1c';
      else if (val > 300) color = '#ea580c';
      else if (val > 100) color = '#f59e0b';
      return { fillColor: color, fillOpacity: 0.7, color: '#fff', weight: 2 };
    }
    if (baciaHeatmap === 'populacao') {
      const val = feature.properties.popul_2010 || 0;
      let color = '#fef08a';
      if (val > 50000000) color = '#b91c1c';
      else if (val > 20000000) color = '#ea580c';
      else if (val > 10000000) color = '#f59e0b';
      return { fillColor: color, fillOpacity: 0.7, color: '#fff', weight: 2 };
    }
    return {
      color: '#0284c7',
      weight: 3,
      opacity: 0.9,
      fillColor: '#0ea5e9',
      fillOpacity: 0.2
    };
  };

  return (
    <div className="map-container" style={{ position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={zoomLevel}
        style={{ height: '100%', width: '100%' }}
      >
        {mapLayer === 'osm' ? (
          <TileLayer
            key="osm"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            key="satellite"
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {showBiomas && (
          <WMSTileLayer
            key="ibge-biomas"
            url="https://geoservicos.ibge.gov.br/geoserver/ows"
            layers="CREN:lm_bioma_250"
            format="image/png"
            transparent={true}
            attribution="IBGE / INDE"
            opacity={0.5}
            zIndex={10}
          />
        )}

        {showVegetation && (
          <WMSTileLayer
            key="ibge-vegetation"
            url="https://geoservicos.ibge.gov.br/geoserver/ows"
            layers="CREN:vegetacao_area_brasil"
            format="image/png"
            transparent={true}
            attribution="IBGE / INDE"
            opacity={0.5}
            zIndex={11}
          />
        )}

        {lockedCityPath && (
          <MapLocker
            lockedPath={lockedCityPath}
            onFound={(name, geojson) => {
              setSelectedMunicipality(name);
              setBoundaries(prev => ({
                ...prev,
                [name]: geojson
              }));
            }}
          />
        )}

        <MapEvents onMapClick={async (lat, lng) => {
          setSelectedMunicipality(null);

          if (isInsertMode) {
            onMapClick(lat, lng);
          }

          // Buscar o município clicado e seu contorno em background
          try {
            const munName = await fetchMunicipality(lat, lng);
            if (munName) {
              setSelectedMunicipality(munName);

              // Se ainda não temos o contorno em cache, buscamos via IBGE (com fallback Nominatim)
              if (!boundaries[munName]) {
                try {
                  const ibgeInfo = await getIbgeDataByMunicipalityName(munName);
                  if (ibgeInfo && ibgeInfo.id) {
                    const geoRes = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${ibgeInfo.id}?formato=application/vnd.geo+json`);
                    if (geoRes.ok) {
                      const geoJson = await geoRes.json();
                      if (geoJson) {
                        setBoundaries(prev => ({
                          ...prev,
                          [munName]: geoJson
                        }));
                        return;
                      }
                    }
                  }

                  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(munName)}&country=Brazil&format=json&polygon_geojson=1`;
                  const res = await fetch(url, {
                    headers: {
                      'Accept-Language': 'pt-BR,pt;q=0.9',
                      'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
                    }
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0 && data[0].geojson) {
                      setBoundaries(prev => ({
                        ...prev,
                        [munName]: data[0].geojson
                      }));
                    }
                  }
                } catch (e) {
                  console.error("Error fetching boundary on click for", munName, e);
                }
              }
            }
          } catch (error) {
            console.error("Error in reverse geocoding on click:", error);
          }
        }} />

        {selectedMunicipality && boundaries[selectedMunicipality] && (
          <GeoJSON
            key={`boundary-${selectedMunicipality}`}
            data={boundaries[selectedMunicipality]}
            interactive={false}
            style={{
              color: 'var(--primary-color)',
              weight: 2,
              opacity: 0.6,
              fillColor: 'var(--primary-color)',
              fillOpacity: 0.1
            }}
          />
        )}

        {showUgrhi4 && ugrhiGeoJson && (
          <GeoJSON
            key="ugrhi4-layer"
            data={ugrhiGeoJson}
            interactive={false}
            style={{
              color: '#000080',
              weight: 3,
              opacity: 0.9,
              fillColor: '#3b82f6',
              fillOpacity: 0.15
            }}
          />
        )}

        {(showBaciasIbge || activeBacias.length > 0) && baciasIbgeGeoJson && (
          <GeoJSON
            key={`bacias-ibge-layer-${showBaciasIbge}-${activeBacias.join(',')}-${baciaHeatmap}`}
            data={{
              ...baciasIbgeGeoJson,
              features: showBaciasIbge
                ? baciasIbgeGeoJson.features
                : baciasIbgeGeoJson.features.filter((f: any) => activeBacias.includes(f.properties?.nome_bacia))
            }}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const p = feature.properties;
                layer.bindPopup(`
                  <div style="font-family: Inter, sans-serif; font-size: 14px; line-height: 1.5;">
                    <h3 style="margin: 0 0 8px 0; color: #0284c7; font-size: 16px;">${p.nome_bacia || 'Bacia Desconhecida'}</h3>
                    <p style="margin: 0;"><strong>Área Territorial:</strong> ${p.area_terri ? Math.round(p.area_terri).toLocaleString('pt-BR') : 'N/A'} km²</p>
                    <p style="margin: 0;"><strong>Rio Principal:</strong> ${p.curso_prin || 'N/A'}</p>
                    <p style="margin: 0;"><strong>População (2010):</strong> ${p.popul_2010 ? Math.round(p.popul_2010).toLocaleString('pt-BR') : 'N/A'} hab</p>
                    <p style="margin: 0;"><strong>Demanda Hídrica:</strong> ${p.dem_total ? p.dem_total.toLocaleString('pt-BR') : 'N/A'} (m³/s)</p>
                  </div>
                `);
              }
            }}
            style={getHeatmapStyle}
          />
        )}

        {showMeso && mesoGeoJson && (
          <GeoJSON
            key="mesorregioes-layer"
            data={mesoGeoJson}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const p = feature.properties;
                layer.bindPopup(`
                  <div style="font-family: Inter, sans-serif; font-size: 14px; line-height: 1.5;">
                    <h3 style="margin: 0 0 8px 0; color: #16a34a; font-size: 16px;">${p.nm_mesoRH || 'Mesorregião Desconhecida'}</h3>
                    <p style="margin: 0;"><strong>Macrorregião:</strong> ${p.nm_macroRH || 'N/A'}</p>
                    <p style="margin: 0;"><strong>Área:</strong> ${p.area ? Math.round(p.area).toLocaleString('pt-BR') : 'N/A'} km²</p>
                  </div>
                `);
              }
            }}
            style={{
              color: '#16a34a', // green border
              weight: 1.5,
              opacity: 0.8,
              fillColor: '#22c55e',
              fillOpacity: 0.1
            }}
          />
        )}

        {markers.map((marker) => {
          const markerColor = getEventColor(marker.event_type_name);
          const customIcon = createCustomMarkerIcon(markerColor);

          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => setSelectedMunicipality(marker.municipality)
              }}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: markerColor, 
                        display: 'inline-block',
                        flexShrink: 0
                      }} 
                    />
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary-color)' }}>
                      {marker.event_type_name || 'Desconhecido'}
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                    <strong>Data:</strong> {marker.date ? marker.date.split('-').reverse().join('/') : ''} às {marker.time}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                    <strong>Local:</strong> {marker.municipality}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                    <strong>Coordenadas:</strong> {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                  </p>
                  <div style={{ margin: '6px 0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong>Gravidade:</strong>
                    {onUpdateSeverity ? (
                      <>
                        <select
                          value={editingSeverities[marker.id] ?? (marker.severity || 'Baixa')}
                          onChange={(e) => {
                            const val = e.target.value as EventSeverity;
                            setEditingSeverities(prev => ({ ...prev, [marker.id]: val }));
                          }}
                          style={{ padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: 'auto' }}
                        >
                          <option value="Baixa">Baixa</option>
                          <option value="Média">Média</option>
                          <option value="Alta">Alta</option>
                        </select>
                        <button
                          type="button"
                          disabled={savingSeverityId === marker.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newSev = editingSeverities[marker.id] ?? (marker.severity || 'Baixa');
                            setSavingSeverityId(marker.id);
                            await onUpdateSeverity(marker.id, newSev);
                            setSavingSeverityId(null);
                          }}
                          style={{ padding: '4px 8px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {savingSeverityId === marker.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </>
                    ) : (
                      <span>{marker.severity || 'Baixa'}</span>
                    )}
                  </div>
                  <div style={{ margin: '6px 0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong>Status:</strong>
                    {onUpdateStatus ? (
                      <>
                        <select
                          value={editingStatuses[marker.id] ?? (marker.status || 'Aberto')}
                          onChange={(e) => {
                            const val = e.target.value as EventStatus;
                            setEditingStatuses(prev => ({ ...prev, [marker.id]: val }));
                          }}
                          style={{ padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: 'auto' }}
                        >
                          <option value="Aberto">Aberto</option>
                          <option value="Em Atendimento">Em Atendimento</option>
                          <option value="Resolvido">Resolvido</option>
                        </select>
                        <button
                          type="button"
                          disabled={savingStatusId === marker.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newStat = editingStatuses[marker.id] ?? (marker.status || 'Aberto');
                            setSavingStatusId(marker.id);
                            await onUpdateStatus(marker.id, newStat);
                            setSavingStatusId(null);
                          }}
                          style={{ padding: '4px 8px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {savingStatusId === marker.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </>
                    ) : (
                      <span>{marker.status || 'Aberto'}</span>
                    )}
                  </div>
                  {marker.observation && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      "{marker.observation}"
                    </p>
                  )}
                  {onDeleteMarker && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Tem certeza que deseja excluir este evento?')) {
                          onDeleteMarker(marker.id);
                        }
                      }}
                      style={{ marginTop: '12px', padding: '6px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', width: '100%', fontWeight: 600 }}
                    >
                      Excluir Evento
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legenda de Tipos de Eventos */}
      {legendTypes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(6px)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          border: '1px solid #cbd5e1',
          width: '240px',
          maxHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div 
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderBottom: isLegendOpen ? '1px solid #e2e8f0' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
              Legenda de Eventos
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {isLegendOpen ? '▲' : '▼'}
            </span>
          </div>

          {isLegendOpen && (
            <div style={{
              padding: '10px 14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '7px'
            }}>
              {legendTypes.map(typeName => {
                const color = getEventColor(typeName);
                return (
                  <div key={typeName} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px', color: '#334155' }}>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 0 1px #94a3b8',
                      flexShrink: 0
                    }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={typeName}>
                      {typeName}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {baciaHeatmap !== 'none' && showBaciasIbge && (
        <div style={{ position: 'absolute', bottom: '30px', right: '30px', zIndex: 1000, backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#334155' }}>
            {baciaHeatmap === 'demanda' ? 'Demanda Hídrica (m³/s)' : 'População (2010)'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '16px', height: '16px', backgroundColor: '#b91c1c', borderRadius: '4px', opacity: 0.7 }}></span> {baciaHeatmap === 'demanda' ? '> 500' : '> 50 Milhões'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '16px', height: '16px', backgroundColor: '#ea580c', borderRadius: '4px', opacity: 0.7 }}></span> {baciaHeatmap === 'demanda' ? '300 - 500' : '20M - 50M'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '16px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '4px', opacity: 0.7 }}></span> {baciaHeatmap === 'demanda' ? '100 - 300' : '10M - 20M'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '16px', height: '16px', backgroundColor: '#fef08a', borderRadius: '4px', opacity: 0.7, border: '1px solid #cbd5e1' }}></span> {baciaHeatmap === 'demanda' ? '< 100' : '< 10 Milhões'}</div>
          </div>
        </div>
      )}
    </div>
  );
};
