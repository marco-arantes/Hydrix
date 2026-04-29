import { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapArea } from './components/MapArea';
import { EventModal } from './components/EventModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { MarkerEvent, FilterState } from './types';
import { INITIAL_TYPES } from './types';
import './index.css';

function App() {
  const [markers, setMarkers] = useLocalStorage<MarkerEvent[]>('map-events', []);
  const [availableTypes, setAvailableTypes] = useLocalStorage<string[]>('event-types', INITIAL_TYPES);

  const [filter, setFilter] = useState<FilterState>({
    municipality: '',
    eventType: '',
    startDate: '',
    endDate: ''
  });

  const [modalState, setModalState] = useState<{ isOpen: boolean, lat?: number, lng?: number } | null>(null);
  const [showUgrhi4, setShowUgrhi4] = useLocalStorage<boolean>('show-ugrhi4', false);
  const [isInsertMode, setIsInsertMode] = useLocalStorage<boolean>('is-insert-mode', true);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    console.log('nova versao')
    setModalState({ isOpen: true, lat, lng });
  };

  const handleSaveEvent = (newEvent: MarkerEvent) => {
    setMarkers([...markers, newEvent]);
    setModalState(null);
  };

  const handleAddType = (newType: string) => {
    if (!availableTypes.includes(newType)) {
      setAvailableTypes([...availableTypes, newType]);
    }
  };

  // Filter markers based on sidebar state
  const filteredMarkers = useMemo(() => {
    return markers.filter(marker => {
      // Filter by municipality
      if (filter.municipality && marker.municipality !== filter.municipality) {
        return false;
      }
      // Filter by event type
      if (filter.eventType && marker.type !== filter.eventType) {
        return false;
      }
      // Filter by date range
      if (filter.startDate && marker.date < filter.startDate) {
        return false;
      }
      if (filter.endDate && marker.date > filter.endDate) {
        return false;
      }
      return true;
    });
  }, [markers, filter]);

  return (
    <div className="app-container">
      <Sidebar
        filter={filter}
        setFilter={setFilter}
        markers={markers}
        availableTypes={availableTypes}
        showUgrhi4={showUgrhi4}
        setShowUgrhi4={setShowUgrhi4}
        isInsertMode={isInsertMode}
        setIsInsertMode={setIsInsertMode}
        selectedMunicipality={selectedMunicipality}
      />

      <MapArea
        markers={filteredMarkers}
        onMapClick={handleMapClick}
        showUgrhi4={showUgrhi4}
        isInsertMode={isInsertMode}
        selectedMunicipality={selectedMunicipality}
        setSelectedMunicipality={setSelectedMunicipality}
      />

      {modalState?.isOpen && (
        <EventModal
          lat={modalState.lat}
          lng={modalState.lng}
          onClose={() => setModalState(null)}
          onSave={handleSaveEvent}
          availableTypes={availableTypes}
          onAddType={handleAddType}
        />
      )}
    </div>
  );
}

export default App;
