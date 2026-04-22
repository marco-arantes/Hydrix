import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import type { MarkerEvent } from '../types';

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
}

const MapEvents: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const MapArea: React.FC<MapAreaProps> = ({ markers, onMapClick, showUgrhi4 }) => {
  // Center of Brazil roughly
  const defaultCenter: [number, number] = [-14.235, -51.925];
  const zoomLevel = 4;

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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapClick={onMapClick} />

        {Object.entries(boundaries).map(([mun, geojson]) => (
          <GeoJSON 
            key={`boundary-${mun}`} 
            data={geojson} 
            style={{
              color: 'var(--primary-color)',
              weight: 2,
              opacity: 0.6,
              fillColor: 'var(--primary-color)',
              fillOpacity: 0.1
            }}
          />
        ))}

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
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
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
                {marker.observation && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "{marker.observation}"
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
