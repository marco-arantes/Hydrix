import { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { MapArea } from './components/MapArea';
import { EventModal } from './components/EventModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { MarkerEvent, FilterState, UserProfile } from './types';
import { supabase } from './lib/supabase';
import { Auth, UpdatePassword } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { LogOut, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import './index.css';

const normalizeString = (str?: string | null) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
};

function App() {
  const [markers, setMarkers] = useState<MarkerEvent[]>([]);
  const [availableTypes, setAvailableTypes] = useState<{ id: string, name: string }[]>([]);

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

  // Map layer controls
  const [mapLayer, setMapLayer] = useLocalStorage<'osm' | 'satellite'>('map-layer', 'osm');
  const [showBiomas, setShowBiomas] = useLocalStorage<boolean>('show-biomas', false);
  const [showVegetation, setShowVegetation] = useLocalStorage<boolean>('show-vegetation', false);
  const [showBaciasIbge, setShowBaciasIbge] = useLocalStorage<boolean>('show-bacias-ibge', false);
  const [showMeso, setShowMeso] = useLocalStorage<boolean>('show-meso', false);
  const [baciaHeatmap, setBaciaHeatmap] = useLocalStorage<string>('bacia-heatmap', 'none');
  const [activeBacias, setActiveBacias] = useLocalStorage<string[]>('active-bacias', []);

  // Auth and Roles
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Initialize session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email || '', session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      if (session) {
        fetchProfile(session.user.id, session.user.email || '', session);
      } else {
        setProfile(null);
        setMarkers([]);
        setFilter({ municipality: '', eventType: '', startDate: '', endDate: '' });
        setSelectedMunicipality(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string, currentSession?: any) => {
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .single();

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Fetching profile for', userId, 'Role Result:', roleData, 'Profile Result:', profileData);

    const role = (!error && roleData) ? roleData.role : 'CIDADÃO';
    const metadata = currentSession?.user?.user_metadata || {};
    const userMun = profileData?.municipality || metadata.municipality;

    setProfile({
      id: userId,
      email,
      role: role as any,
      name: profileData?.name || metadata.name,
      municipality: userMun
    });

    if (role !== 'ADMIN' && userMun) {
      setSelectedMunicipality(userMun);
      setFilter(prev => ({ ...prev, municipality: userMun }));
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!session) return;

    async function fetchData() {
      // Fetch event types
      const { data: typesData, error: typesError } = await supabase
        .from('event_types')
        .select('id, name');

      if (typesError) {
        console.error('Error fetching event types:', typesError);
      } else if (typesData) {
        const sortedTypes = [...typesData].sort((a, b) => a.name.localeCompare(b.name));
        setAvailableTypes(sortedTypes);
      }

      // Fetch markers (events) with joined event_types
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, event_type_id, date, time, observation, municipality, lat, lng, user_id, event_types(name)');

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        alert('Erro ao buscar eventos: ' + (eventsError.message || JSON.stringify(eventsError)));
      } else if (eventsData) {
        const formattedEvents = eventsData.map((e: any) => ({
          ...e,
          event_type_name: e.event_types?.name
        }));
        setMarkers(formattedEvents);
      }
    }

    fetchData();
  }, [session]);

  const handleMapClick = (lat: number, lng: number) => {
    setModalState({ isOpen: true, lat, lng });
  };

  const handleSaveEvent = async (newEvent: MarkerEvent) => {
    if (!session) return;

    // Strip old/display properties to avoid schema errors from cached clients
    const { event_type_name, type, ...rest } = newEvent as any;

    // Insert into Supabase
    const eventToSave = { ...rest, user_id: session.user.id };
    const { error } = await supabase
      .from('events')
      .insert([eventToSave]);

    if (error) {
      console.error('Error saving event:', error);
      alert('Erro ao salvar evento: ' + (error.message || JSON.stringify(error)));
      return;
    }

    const typeObj = availableTypes.find(t => t.id === eventToSave.event_type_id);
    setMarkers([...markers, { ...eventToSave, event_type_name: typeObj?.name }]);
    setModalState(null);
  };

  const handleAddType = async (newType: string) => {
    if (!availableTypes.find(t => t.name === newType)) {
      const { data, error } = await supabase
        .from('event_types')
        .insert([{ name: newType }])
        .select('id, name')
        .single();

      if (error) {
        console.error('Error saving event type:', error);
        alert('Erro ao salvar tipo de evento.');
        return;
      }

      if (data) {
        const newTypes = [...availableTypes, data];
        newTypes.sort((a, b) => a.name.localeCompare(b.name));
        setAvailableTypes(newTypes);
      }
    }
  };

  const handleDeleteMarker = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      alert('Erro ao deletar evento.');
      return;
    }

    setMarkers(markers.filter(marker => marker.id !== id));
  };

  // Filter markers based on sidebar state
  const filteredMarkers = useMemo(() => {
    return markers.filter(marker => {
      // Filter by municipality (ignoring case and accents, checking if one contains the other)
      if (filter.municipality) {
        const normMarker = normalizeString(marker.municipality);
        const normFilter = normalizeString(filter.municipality);
        if (!normMarker.includes(normFilter) && !normFilter.includes(normMarker)) {
          return false;
        }
      }
      // Filter by event type
      if (filter.eventType && marker.event_type_name !== filter.eventType) {
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

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (filteredMarkers.length === 0) {
      alert('Nenhum dado para exportar com os filtros atuais.');
      return;
    }

    // Fetch user profiles to map names
    const { data: profiles } = await supabase.from('user_profiles').select('id, name');
    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    };

    const dataToExport = filteredMarkers.map(m => ({
      'ID': m.id,
      'Tipo de Evento': m.event_type_name || 'Desconhecido',
      'Município': m.municipality,
      'Data': formatDate(m.date),
      'Hora': m.time,
      'Observação': m.observation,
      'Latitude': m.lat,
      'Longitude': m.lng,
      'Usuário Nome': m.user_id ? (profileMap.get(m.user_id) || 'Desconhecido') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eventos");

    if (format === 'csv') {
      XLSX.writeFile(workbook, "Relatorio_Eventos.csv", { bookType: "csv" });
    } else {
      XLSX.writeFile(workbook, "Relatorio_Eventos.xlsx", { bookType: "xlsx" });
    }
  };

  const canDelete = profile?.role === 'ADMIN' || profile?.role === 'GESTOR';

  return (
    <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh' }}>
      <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', zIndex: 1100 }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#3b82f6' }}>HYDRIX</div>
        <div className="auth-buttons-top" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {session && !isRecoveryMode && (
            <>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '10px', textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>{profile?.name || profile?.email}</div>
                <div>{profile?.municipality || 'Sem município'} • {profile?.role}</div>
              </div>
              {profile?.role === 'ADMIN' && (
                <button onClick={() => setShowAdminPanel(true)} className="btn-primary">
                  <Settings size={16} /> Painel Admin
                </button>
              )}
              <button onClick={() => supabase.auth.signOut()} className="btn-danger">
                <LogOut size={16} /> Sair
              </button>
            </>
          )}
        </div>
      </div>

      <div className="app-container" style={{ display: 'flex', flex: 1 }}>

        {session && !isRecoveryMode ? (
          <>
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
              setSelectedMunicipality={setSelectedMunicipality}
              mapLayer={mapLayer}
              setMapLayer={setMapLayer}
              showBiomas={showBiomas}
              setShowBiomas={setShowBiomas}
              showVegetation={showVegetation}
              setShowVegetation={setShowVegetation}
              showBaciasIbge={showBaciasIbge}
              setShowBaciasIbge={setShowBaciasIbge}
              showMeso={showMeso}
              setShowMeso={setShowMeso}
              baciaHeatmap={baciaHeatmap}
              setBaciaHeatmap={setBaciaHeatmap}
              activeBacias={activeBacias}
              setActiveBacias={setActiveBacias}
              canExport={canDelete}
              onExport={handleExport}
            />

            <MapArea
              markers={filteredMarkers}
              onMapClick={handleMapClick}
              onDeleteMarker={canDelete ? handleDeleteMarker : undefined}
              showUgrhi4={showUgrhi4}
              isInsertMode={isInsertMode}
              selectedMunicipality={selectedMunicipality}
              setSelectedMunicipality={setSelectedMunicipality}
              mapLayer={mapLayer}
              showBiomas={showBiomas}
              showVegetation={showVegetation}
              showBaciasIbge={showBaciasIbge}
              showMeso={showMeso}
              baciaHeatmap={baciaHeatmap}
              activeBacias={activeBacias}
            />

            <div className="desktop-right-sidebar">
              <RightSidebar selectedMunicipality={selectedMunicipality} markers={markers} />
            </div>
          </>
        ) : isRecoveryMode ? (
          <UpdatePassword onComplete={() => setIsRecoveryMode(false)} />
        ) : (
          <Auth />
        )}

        {modalState && (
          <EventModal
            lat={modalState.lat}
            lng={modalState.lng}
            onClose={() => setModalState(null)}
            onSave={handleSaveEvent}
            availableTypes={availableTypes}
            onAddType={handleAddType}
            userMunicipality={profile?.role === 'CIDADÃO' ? profile?.municipality : undefined}
          />
        )}

        {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
      </div>
    </div>
  );
}

export default App;
