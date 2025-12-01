import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Trash2, Save, Loader, AlertCircle } from 'lucide-react';
import { getClinic, updateClinic } from '../services/clinicService';

interface GoogleCalendar {
  id: string;
  name: string;
  email: string;
  serviceType: string;
  enabled: boolean;
}

export default function ManageCalendars() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clinic, setClinic] = useState<any>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);

  useEffect(() => {
    loadClinic();
  }, [clinicId]);

  async function loadClinic() {
    if (!clinicId) return;
    try {
      const data = await getClinic(clinicId);
      setClinic(data);
      setCalendars(data?.google_calendars || []);
    } catch (err) {
      setError('Error al cargar la clínica');
    } finally {
      setLoading(false);
    }
  }

  function addCalendar() {
    const name = prompt('Nombre del calendario (ej: Consultas Generales):');
    if (!name || !name.trim()) return;

    const email = prompt('Email del calendario de Google:');
    if (!email || !email.trim()) return;

    const serviceType = prompt('Tipo de servicio (ej: Medicina General, Pediatría):');

    const newCalendar: GoogleCalendar = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      serviceType: serviceType?.trim() || 'General',
      enabled: true,
    };

    setCalendars(prev => [...prev, newCalendar]);
  }

  function removeCalendar(id: string) {
    setCalendars(prev => prev.filter(cal => cal.id !== id));
  }

  function toggleCalendar(id: string) {
    setCalendars(prev => prev.map(cal =>
      cal.id === id ? { ...cal, enabled: !cal.enabled } : cal
    ));
  }

  async function handleSave() {
    if (!clinicId) return;
    setSaving(true);
    setError('');
    try {
      await updateClinic(clinicId, {
        google_calendars: calendars,
      });
      navigate(`/clinic/${clinicId}`);
    } catch (err) {
      setError('Error al guardar los calendarios');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(`/clinic/${clinicId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Gestionar Calendarios</h1>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Conecta tus calendarios de Google</p>
            <p>Los agentes podrán consultar disponibilidad, reservar, anular y reagendar citas en estos calendarios. Asegúrate de que la cuenta de Google Calendar esté configurada correctamente y que el email sea accesible.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Calendarios Conectados</h2>
            <button
              onClick={addCalendar}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Añadir Calendario
            </button>
          </div>

          {calendars.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin calendarios</h3>
              <p className="text-gray-600 mb-4">Añade un calendario de Google para que los agentes puedan gestionar citas</p>
              <button
                onClick={addCalendar}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Añadir Primer Calendario
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${calendar.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{calendar.name}</h3>
                      <p className="text-sm text-gray-600">{calendar.email}</p>
                      <p className="text-xs text-gray-500 mt-1">Servicio: {calendar.serviceType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCalendar(calendar.id)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        calendar.enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {calendar.enabled ? 'Activo' : 'Inactivo'}
                    </button>
                    <button
                      onClick={() => removeCalendar(calendar.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => navigate(`/clinic/${clinicId}`)}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Calendarios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
