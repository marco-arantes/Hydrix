import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { MarkerEvent } from '../types';
import { fetchMunicipality, geocodeMunicipality } from '../utils/reverseGeocode';

interface EventModalProps {
  lat?: number;
  lng?: number;
  onClose: () => void;
  onSave: (event: MarkerEvent) => void;
  availableTypes: string[];
  onAddType: (newType: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ 
  lat, 
  lng, 
  onClose, 
  onSave, 
  availableTypes, 
  onAddType 
}) => {
  const [type, setType] = useState(availableTypes[0] || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [observation, setObservation] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [formLat, setFormLat] = useState(lat !== undefined ? String(lat) : '');
  const [formLng, setFormLng] = useState(lng !== undefined ? String(lng) : '');
  
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isLoadingMunicipality, setIsLoadingMunicipality] = useState(lat !== undefined && lng !== undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-fetch municipality based on Geolocation if lat/lng are provided
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    
    let active = true;
    const getMun = async () => {
      setIsLoadingMunicipality(true);
      const m = await fetchMunicipality(lat, lng);
      if (active) {
        setMunicipality(m);
        setIsLoadingMunicipality(false);
      }
    };
    getMun();
    return () => { active = false; };
  }, [lat, lng]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      alert("Por favor, selecione ou crie um tipo de evento.");
      return;
    }
    
    let finalLat = parseFloat(formLat);
    let finalLng = parseFloat(formLng);

    if (isNaN(finalLat) || isNaN(finalLng)) {
      if (!municipality.trim()) {
        alert("Por favor, informe o município ou as coordenadas geográficas.");
        return;
      }
      setIsSaving(true);
      const coords = await geocodeMunicipality(municipality);
      setIsSaving(false);
      
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
      } else {
        alert("Não foi possível encontrar o município no mapa. Tente digitar o nome completo ou insira as coordenadas.");
        return;
      }
    }
    
    onSave({
      id: uuidv4(),
      type,
      date,
      time,
      observation,
      municipality,
      lat: finalLat,
      lng: finalLng
    });
  };

  const handleAddType = () => {
    if (newTypeName.trim()) {
      onAddType(newTypeName.trim());
      setType(newTypeName.trim());
      setNewTypeName('');
      setIsCreatingType(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSave}>
          <div className="modal-header">
            <h2>Registrar Evento Crítico</h2>
            <button type="button" className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label>Tipo de Evento</label>
              {!isCreatingType ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="" disabled>Selecione um tipo...</option>
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={() => setIsCreatingType(true)}
                    title="Novo Tipo"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ) : (
                <div className="add-type-container">
                  <input 
                    type="text" 
                    placeholder="Nome do novo tipo..." 
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={handleAddType}
                  >
                    Salvar
                  </button>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={() => setIsCreatingType(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="date-time-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Data</label>
                <input 
                  type="date" 
                  required 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Horário</label>
                <input 
                  type="time" 
                  required 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Município</label>
              <input 
                type="text" 
                required 
                value={municipality} 
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder={isLoadingMunicipality ? "Buscando localização..." : "Digite o município"}
                className={isLoadingMunicipality ? "loading-pulse" : ""}
              />
            </div>

            <div className="date-time-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={formLat} 
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="Ex: -23.5505"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={formLng} 
                  onChange={(e) => setFormLng(e.target.value)}
                  placeholder="Ex: -46.6333"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Observação</label>
              <textarea 
                rows={3} 
                value={observation} 
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Detalhes adicionais do evento..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose} disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Buscando Localização...' : 'Salvar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
