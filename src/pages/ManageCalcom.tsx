import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, Plus, Trash2, CheckCircle } from 'lucide-react';
import {
  getCalcomConfig,
  saveCalcomConfig,
  getCalcomEventTypes,
  saveCalcomEventType,
  deleteCalcomEventType,
  fetchCalcomEventTypes,
  updateAgentPromptWithCalcom,
  updateAllAgentsPromptsForClinic,
  CalcomEventType,
} from '../services/calcomService';
import { getClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';

export default function ManageCalcom() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [eventTypes, setEventTypes] = useState<CalcomEventType[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadData();
  }, [clinicId]);

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, agentsData, config, eventTypesData] = await Promise.all([
        getClinic(clinicId),
        getClinicAgents(clinicId),
        getCalcomConfig(clinicId),
        getCalcomEventTypes(clinicId),
      ]);

      setClinic(clinicData);
      setAgents(agentsData);
      if (config) {
        setApiKey(config.api_key);
        setEnabled(config.enabled);
      }
      setEventTypes(eventTypesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    if (!clinicId || !apiKey.trim()) {
      alert('Por favor ingresa tu API Key de Cal.com');
      return;
    }

    setSaving(true);
    try {
      await saveCalcomConfig(clinicId, apiKey, enabled);
      await loadData(); // Recargar datos después de guardar
      alert('Configuración guardada correctamente');
    } catch (error) {
      alert('Error al guardar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function handleFetchEvents() {
    if (!clinicId) {
      alert('No se pudo identificar la clínica');
      return;
    }

    // Recargar la configuración para asegurar que tenemos la API key más reciente
    const config = await getCalcomConfig(clinicId);
    if (!config || !config.api_key || !config.api_key.trim()) {
      alert('Primero guarda tu API Key de Cal.com');
      return;
    }

    setFetching(true);
    try {
      const events = await fetchCalcomEventTypes(config.api_key);
      setAvailableEvents(events);
      if (events.length === 0) {
        alert('No se encontraron eventos en tu cuenta de Cal.com. Crea eventos primero en Cal.com y luego vuelve a intentar.');
      }
    } catch (error) {
      alert('Error al obtener eventos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setFetching(false);
    }
  }

  async function handleImportEvent(event: any) {
    if (!clinicId) return;

    try {
      await saveCalcomEventType({
        clinic_id: clinicId,
        external_event_id: event.id,
        event_name: event.title,
        duration_minutes: event.length,
        description: event.description || '',
        enabled: true,
      });

      await loadData();

      // Actualizar los prompts de todos los agentes de la clínica
      try {
        await updateAllAgentsPromptsForClinic(clinicId);
      } catch (promptError) {
        console.error('Error al actualizar prompts:', promptError);
        // No bloqueamos el flujo si falla la actualización del prompt
      }

      alert('Evento importado correctamente. Los agentes han sido actualizados con las nuevas instrucciones.');
    } catch (error) {
      alert('Error al importar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  async function handleToggleEventType(eventType: CalcomEventType) {
    try {
      await saveCalcomEventType({
        ...eventType,
        enabled: !eventType.enabled,
      });
      await loadData();

      // Actualizar los prompts de todos los agentes de la clínica
      if (clinicId) {
        try {
          await updateAllAgentsPromptsForClinic(clinicId);
        } catch (promptError) {
          console.error('Error al actualizar prompts:', promptError);
        }
      }
    } catch (error) {
      alert('Error al actualizar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  async function handleDeleteEventType(id: string) {
    if (!confirm('¿Eliminar este tipo de evento?')) return;

    try {
      await deleteCalcomEventType(id);
      await loadData();

      // Actualizar los prompts de todos los agentes de la clínica
      if (clinicId) {
        try {
          await updateAllAgentsPromptsForClinic(clinicId);
        } catch (promptError) {
          console.error('Error al actualizar prompts:', promptError);
        }
      }
    } catch (error) {
      alert('Error al eliminar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  async function handleAssignAgent(eventTypeId: string, agentId: string) {
    const eventType = eventTypes.find(e => e.id === eventTypeId);
    if (!eventType) return;

    try {
      await saveCalcomEventType({
        ...eventType,
        agent_id: agentId || null,
      });
      await loadData();

      // Actualizar el prompt del agente asignado (o de todos si se desasigna)
      if (agentId) {
        try {
          await updateAgentPromptWithCalcom(agentId);
          alert('Agente asignado correctamente. El prompt ha sido actualizado con las instrucciones de Cal.com.');
        } catch (promptError) {
          console.error('Error al actualizar prompt del agente:', promptError);
          alert('Agente asignado, pero hubo un problema al actualizar el prompt. Por favor, verifica la configuración.');
        }
      } else if (clinicId) {
        // Si se desasigna, actualizar todos los agentes
        try {
          await updateAllAgentsPromptsForClinic(clinicId);
        } catch (promptError) {
          console.error('Error al actualizar prompts:', promptError);
        }
      }
    } catch (error) {
      alert('Error al asignar agente: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(`/clinic/${clinicId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Cal.com</h1>
            <p className="text-sm text-gray-500">{clinic?.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Key de Cal.com</h2>
          <p className="text-sm text-gray-600 mb-4">
            Obtén tu API Key desde{' '}
            <a
              href="https://app.cal.com/settings/developer/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Cal.com Settings → Developer → API Keys
            </a>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="cal_live_..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                Habilitar integración con Cal.com
              </label>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>

        {apiKey && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Importar Tipos de Eventos
                </h2>
                <button
                  onClick={handleFetchEvents}
                  disabled={fetching}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                  {fetching ? 'Cargando...' : 'Obtener Eventos'}
                </button>
              </div>

              {availableEvents.length > 0 && (
                <div className="space-y-2">
                  {availableEvents.map((event) => {
                    const alreadyImported = eventTypes.some(
                      (e) => e.external_event_id === event.id
                    );

                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          <p className="text-sm text-gray-500">
                            {event.length} minutos
                            {event.description && ` - ${event.description}`}
                          </p>
                        </div>
                        {alreadyImported ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Importado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImportEvent(event)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Importar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Eventos Configurados
              </h2>

              {eventTypes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay eventos configurados. Importa eventos desde arriba.
                </p>
              ) : (
                <div className="space-y-4">
                  {eventTypes.map((eventType) => (
                    <div
                      key={eventType.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {eventType.event_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {eventType.duration_minutes} minutos
                          </p>
                          {eventType.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {eventType.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleEventType(eventType)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              eventType.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {eventType.enabled ? 'Activo' : 'Inactivo'}
                          </button>
                          <button
                            onClick={() => handleDeleteEventType(eventType.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Asignar a Agente (opcional)
                        </label>
                        <select
                          value={eventType.agent_id || ''}
                          onChange={(e) =>
                            handleAssignAgent(eventType.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">Sin asignar (todos los agentes)</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Los agentes asignados podrán usar este tipo de evento para
                          reservar citas
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
