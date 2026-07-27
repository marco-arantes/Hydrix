import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON, WMSTileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { MarkerEvent } from '../types';
import { fetchMunicipality } from '../utils/reverseGeocode';

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

interface MapAreaProps {
  markers: MarkerEvent[];
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
}

const MapEvents: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const MapArea: React.FC<MapAreaProps> = ({
  markers, onMapClick, showUgrhi4, isInsertMode,
  selectedMunicipality, setSelectedMunicipality,
  mapLayer, showBiomas, showVegetation, showBaciasIbge, showMeso, baciaHeatmap, activeBacias, onDeleteMarker
}) => {
  // Centro aproximado da Bacia do Pardo (UGRHI-4), perto de Ribeirão Preto
  const defaultCenter: [number, number] = [-21.1, -47.8];
  const zoomLevel = 8;

  const fetched = useRef(new Set<string>());
  const [boundaries, setBoundaries] = useState<Record<string, any>>({});
  const [ugrhiGeoJson, setUgrhiGeoJson] = useState<any>(null);
  const [baciasIbgeGeoJson, setBaciasIbgeGeoJson] = useState<any>(null);
  const [mesoGeoJson, setMesoGeoJson] = useState<any>(null);

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
          const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
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

        // Wait 1.1s to respect Nominatim limits
        await new Promise(resolve => setTimeout(resolve, 1100));
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
        <MapEvents onMapClick={async (lat, lng) => {
          setSelectedMunicipality(null);

          if (isInsertMode) {
            onMapClick(lat, lng);
          } else {
            // Modo de visualização: buscar o município clicado e seu contorno
            const munName = await fetchMunicipality(lat, lng);
            if (munName) {
              setSelectedMunicipality(munName);

              // Se ainda não temos o contorno em cache, buscamos
              if (!boundaries[munName]) {
                try {
                  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(munName)}&country=Brazil&format=json&polygon_geojson=1`;
                  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
                  const data = await res.json();

                  if (data && data.length > 0 && data[0].geojson) {
                    setBoundaries(prev => ({
                      ...prev,
                      [munName]: data[0].geojson
                    }));
                  }
                } catch (e) {
                  console.error("Error fetching boundary on click for", munName, e);
                }
              }
            }
          }
        }} />

        {selectedMunicipality && boundaries[selectedMunicipality] && (
          <GeoJSON
            key={`boundary-${selectedMunicipality}`}
            data={boundaries[selectedMunicipality]}
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

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            eventHandlers={{
              click: () => setSelectedMunicipality(marker.municipality)
            }}
          >
            <Popup
              eventHandlers={{
                remove: () => setSelectedMunicipality(null)
              }}
            >
              <div style={{ padding: '4px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--primary-color)' }}>
                  {marker.event_type_name || 'Desconhecido'}
                </h3>
                <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                  <strong>Data:</strong> {marker.date ? marker.date.split('-').reverse().join('/') : ''} às {marker.time}
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                  <strong>Local:</strong> {marker.municipality}
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                  <strong>Coordenadas:</strong> {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                </p>
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
        ))}
      </MapContainer>

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
