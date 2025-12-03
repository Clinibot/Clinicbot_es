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
            {/* Instrucciones claras del proceso */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Cómo configurar Cal.com</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">1</span>
                  <span><strong>Configura tu API Key:</strong> Introduce tu API Key de Cal.com arriba y guárdala</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">2</span>
                  <span><strong>Obtén tus eventos:</strong> Haz clic en "Obtener Eventos" para cargar todos tus tipos de eventos desde Cal.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">3</span>
                  <span><strong>Importa eventos:</strong> En la columna izquierda, importa los eventos que quieras usar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">4</span>
                  <span><strong>Asigna agentes:</strong> En la columna derecha, asigna cada evento a un agente específico o déjalo disponible para todos</span>
                </li>
              </ol>
            </div>

            {/* Botón de obtener eventos */}
            <div className="mb-6 flex justify-center">
              <button
                onClick={handleFetchEvents}
                disabled={fetching}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-lg hover:from-black hover:to-gray-900 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
              >
                <RefreshCw className={`w-5 h-5 ${fetching ? 'animate-spin' : ''}`} />
                {fetching ? 'Obteniendo eventos de Cal.com...' : '🔄 Obtener Eventos de Cal.com'}
              </button>
            </div>

            {/* Diseño de dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda: Eventos Disponibles para Importar */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Eventos Disponibles
                    </h2>
                    <p className="text-xs text-gray-500">
                      Importa eventos de tu cuenta Cal.com
                    </p>
                  </div>
                </div>

                {availableEvents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No hay eventos cargados</p>
                    <p className="text-sm mt-2">
                      Haz clic en "Obtener Eventos" para cargar tus eventos de Cal.com
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {availableEvents.map((event) => {
                      const alreadyImported = eventTypes.some(
                        (e) => e.external_event_id === event.id
                      );

                      return (
                        <div
                          key={event.id}
                          className={`border-2 rounded-lg p-4 transition-all ${
                            alreadyImported
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {event.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                ⏱️ {event.length} minutos
                              </p>
                              {event.description && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {alreadyImported ? (
                                <div className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Importado</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleImportEvent(event)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm hover:shadow"
                                >
                                  Importar →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Eventos Configurados */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-green-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Eventos Configurados
                    </h2>
                    <p className="text-xs text-gray-500">
                      Asigna agentes a tus eventos importados
                    </p>
                  </div>
                </div>

                {eventTypes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-3xl">📅</span>
                    </div>
                    <p className="font-medium">No hay eventos configurados</p>
                    <p className="text-sm mt-2">
                      Los eventos que importes aparecerán aquí para que puedas asignarles agentes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {eventTypes.map((eventType) => (
                      <div
                        key={eventType.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-300 transition-all bg-gradient-to-br from-white to-green-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">
                              {eventType.event_name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              ⏱️ {eventType.duration_minutes} minutos
                            </p>
                            {eventType.description && (
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                {eventType.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleToggleEventType(eventType)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                eventType.enabled
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {eventType.enabled ? '✓ Activo' : '✗ Inactivo'}
                            </button>
                            <button
                              onClick={() => handleDeleteEventType(eventType.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar evento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🤖 Asignar a Agente
                          </label>
                          <select
                            value={eventType.agent_id || ''}
                            onChange={(e) =>
                              handleAssignAgent(eventType.id, e.target.value)
                            }
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          >
                            <option value="">📢 Sin asignar (todos los agentes)</option>
                            {agents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-2 italic">
                            {eventType.agent_id
                              ? 'Este evento solo estará disponible para el agente seleccionado'
                              : 'Todos los agentes podrán usar este evento para reservar citas'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
