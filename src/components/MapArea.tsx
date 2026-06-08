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
  mapLayer, showBiomas, showVegetation, onDeleteMarker
}) => {
  // Centro aproximado da Bacia do Pardo (UGRHI-4), perto de Ribeirão Preto
  const defaultCenter: [number, number] = [-21.1, -47.8];
  const zoomLevel = 8;

  const fetched = useRef(new Set<string>());
  const [boundaries, setBoundaries] = useState<Record<string, any>>({});
  const [ugrhiGeoJson, setUgrhiGeoJson] = useState<any>(null);

  useEffect(() => {
    if (showUgrhi4 && !ugrhiGeoJson) {
      fetch('/ugrhi4.geojson')
        .then(res => res.json())
        .then(data => setUgrhiGeoJson(data))
        .catch(err => console.error('Erro ao carregar UGRHI-4:', err));
    }
  }, [showUgrhi4, ugrhiGeoJson]);

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

  return (
    <div className="map-container">
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
                  {marker.type}
                </h3>
                <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                  <strong>Data:</strong> {new Date(marker.date).toLocaleDateString('pt-BR')} às {marker.time}
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
    </div>
  );
};
