import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Phone, Plus, X, Settings, MessageSquare, Edit, ChevronDown, ChevronUp, Calendar, CheckCircle, Target, Zap, Globe, Key, Eye, EyeOff } from 'lucide-react';
import { getAgent, updateAgent, deleteAgent, VOICES, LANGUAGES } from '../services/agentService';
import { updateRetellAgent, deleteRetellAgent, updateAgentWebhook } from '../services/retellService';
import { Agent, SuccessMetric, CustomFunction } from '../types';
import WebPlayground from '../components/WebPlayground';
import { buildAgentTools } from '../services/agentToolsService';
import { supabase } from '../lib/supabase';

interface Transfer {
  name: string;
  phone: string;
  description: string;
  type: 'phone' | 'agent';
  agent_id?: string; // For agent-to-agent transfers
}

interface CalcomEventType {
  id: string;
  event_name: string;
  duration_minutes: number;
  description: string | null;
  enabled: boolean;
  external_event_id: number;
}

export default function AgentDetail() {
  const { clinicId, agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'playground' | 'transfers'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [language, setLanguage] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetric[]>([]);
  const [customFunctions, setCustomFunctions] = useState<CustomFunction[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [calcomEvents, setCalcomEvents] = useState<CalcomEventType[]>([]);
  const [calcomUsername, setCalcomUsername] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  async function loadAgent() {
    if (!agentId) return;
    try {
      const data = await getAgent(agentId);
      if (data) {
        setAgent(data);
        setName(data.name);
        setPrompt(data.prompt);
        setVoiceId(data.voice_id || VOICES[0].id);
        setLanguage(data.language || LANGUAGES[0].id);

        // Migrate old transfers to include type field
        const migratedTransfers = (data.transfers || []).map(t => ({
          ...t,
          type: t.type || 'phone' as 'phone' | 'agent'
        }));
        setTransfers(migratedTransfers);

        // Load success metrics
        setSuccessMetrics(data.success_metrics || []);

        // Load custom functions
        setCustomFunctions(data.custom_functions || []);

        // Load other agents from the same clinic for agent-to-agent transfers
        try {
          const { data: agents } = await supabase
            .from('agents')
            .select('*')
            .eq('clinic_id', data.clinic_id)
            .neq('id', agentId)
            .eq('enabled', true);

          setAvailableAgents(agents || []);
        } catch (err) {
          console.error('Error loading available agents:', err);
        }

        // Cargar eventos de Cal.com asignados a este agente
        try {
          const { data: events } = await supabase
            .from('calcom_event_types')
            .select('id, event_name, duration_minutes, description, enabled, external_event_id')
            .eq('clinic_id', data.clinic_id)
            .eq('enabled', true)
            .or(`agent_id.is.null,agent_id.eq.${agentId}`);

          setCalcomEvents(events || []);

          // Cargar config de Cal.com si existe
          const { data: config } = await supabase
            .from('calcom_config')
            .select('*')
            .eq('clinic_id', data.clinic_id)
            .maybeSingle();

          // Intentar extraer username de API key o configuración
          if (config) {
            setCalcomUsername('cal.com'); // Placeholder
          }
        } catch (err) {
          console.error('Error loading Cal.com events:', err);
        }

        try {
          await updateAgentWebhook(data.retell_agent_id);
        } catch (err) {
          console.error('Error updating webhook:', err);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function generateTransferInstructions(transfers: Transfer[]): string {
    if (transfers.length === 0) return '';

    const instructions = transfers.map(transfer => {
      const action = transfer.type === 'agent'
        ? `ejecuta la función ${transfer.name} para transferir la llamada a otro agente especializado`
        : `ejecuta la función ${transfer.name} para transferir la llamada`;

      return `- Si el usuario solicita ${transfer.description.toLowerCase()}, entonces ${action}`;
    });

    return `\n\n# Transferencias\n\nCuando sea necesario transferir la llamada, sigue estas instrucciones:\n\n${instructions.join('\n')}`;
  }

  function injectTransferInstructions(basePrompt: string, transfers: Transfer[]): string {
    // Remove existing #transferencias section if it exists
    const transferSectionRegex = /\n*#\s*[Tt]ransferencias[\s\S]*?(?=\n#|$)/g;
    let cleanedPrompt = basePrompt.replace(transferSectionRegex, '');

    // Add new transfer instructions if there are any transfers
    if (transfers.length > 0) {
      const transferInstructions = generateTransferInstructions(transfers);
      cleanedPrompt = cleanedPrompt.trim() + transferInstructions;
    }

    return cleanedPrompt;
  }

  async function handleSave() {
    if (!agent || !agentId) return;
    setSaving(true);
    try {
      console.log('=== GUARDANDO AGENTE ===');
      console.log('Agent ID (Supabase):', agentId);
      console.log('Retell Agent ID:', agent.retell_agent_id);
      console.log('Voice ID seleccionado:', voiceId);
      console.log('Nombre de voz:', VOICES.find(v => v.id === voiceId)?.name);

      // Auto-inject transfer instructions into prompt
      const updatedPrompt = injectTransferInstructions(prompt, transfers);
      setPrompt(updatedPrompt);

      const tools = await buildAgentTools(agent.clinic_id, agentId, transfers, customFunctions);

      console.log('Actualizando en Retell AI...');
      await updateRetellAgent(agent.retell_agent_id, {
        name,
        prompt: updatedPrompt,
        voiceId,
        language,
        tools
      });

      console.log('Actualizando en base de datos local...');
      await updateAgent(agentId, { name, prompt: updatedPrompt, voice_id: voiceId, language, transfers, success_metrics: successMetrics, custom_functions: customFunctions });

      console.log('Recargando agente...');
      await loadAgent();
      setShowPromptEditor(false);
      alert('✅ Agente actualizado correctamente\n\nLas instrucciones de transferencia se han añadido automáticamente al prompt.');
    } catch (err) {
      console.error('Error detallado:', err);
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!agent || !agentId || !confirm('¿Eliminar este agente? Esta acción no se puede deshacer.')) return;
    try {
      await deleteRetellAgent(agent.retell_agent_id);
      await deleteAgent(agentId);
      navigate(`/clinic/${clinicId}`);
    } catch (err) {
      alert('Error al eliminar');
    }
  }

  function addTransfer() {
    setTransfers([...transfers, { name: '', phone: '', description: '', type: 'phone' }]);
  }

  function removeTransfer(index: number) {
    setTransfers(transfers.filter((_, i) => i !== index));
  }

  function updateTransfer(index: number, field: keyof Transfer, value: string) {
    const updated = [...transfers];
    (updated[index] as any)[field] = value;
    setTransfers(updated);
  }

  function addSuccessMetric() {
    const newMetric: SuccessMetric = {
      id: `metric_${Date.now()}`,
      name: '',
      type: 'boolean',
    };
    setSuccessMetrics([...successMetrics, newMetric]);
  }

  function removeSuccessMetric(index: number) {
    setSuccessMetrics(successMetrics.filter((_, i) => i !== index));
  }

  function updateSuccessMetric(index: number, updates: Partial<SuccessMetric>) {
    const updated = [...successMetrics];
    updated[index] = { ...updated[index], ...updates };
    setSuccessMetrics(updated);
  }

  function addCustomFunction() {
    const newFunction: CustomFunction = {
      id: `func_${Date.now()}`,
      name: '',
      display_name: '',
      description: '',
      webhook_url: '',
      api_key: '',
      enabled: true,
    };
    setCustomFunctions([...customFunctions, newFunction]);
  }

  function removeCustomFunction(index: number) {
    setCustomFunctions(customFunctions.filter((_, i) => i !== index));
  }

  function updateCustomFunction(index: number, updates: Partial<CustomFunction>) {
    const updated = [...customFunctions];
    updated[index] = { ...updated[index], ...updates };
    setCustomFunctions(updated);
  }

  function toggleApiKeyVisibility(functionId: string) {
    setShowApiKeys(prev => ({
      ...prev,
      [functionId]: !prev[functionId]
    }));
  }

  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedVoice = VOICES.find(v => v.id === voiceId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/clinic/${clinicId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Volver
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <p className="text-sm text-gray-500">ID del Agente</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button onClick={handleDelete} className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'config'
                ? 'bg-white text-blue-600 shadow-md border-2 border-blue-600'
                : 'bg-white text-gray-600 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configuración
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'playground'
                ? 'bg-white text-green-600 shadow-md border-2 border-green-600'
                : 'bg-white text-gray-600 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Playground
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'transfers'
                ? 'bg-white text-purple-600 shadow-md border-2 border-purple-600'
                : 'bg-white text-gray-600 border-2 border-transparent hover:border-gray-300'
            }`}
          >
            <Phone className="w-5 h-5" />
            Transferencias
          </button>
        </div>

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Información Básica</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Agente</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Agente</label>
                    <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                      agent.agent_type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {agent.agent_type === 'inbound' ? '📞 Llamadas Entrantes' : '📲 Llamadas Salientes'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Voz</label>
                      <select
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                      <span className={`inline-flex px-4 py-3 rounded-lg text-sm font-medium ${
                        agent.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {agent.enabled ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      Métricas de Éxito
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Define qué hace que una llamada sea exitosa para este agente
                    </p>
                  </div>
                  <button
                    onClick={addSuccessMetric}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Métrica
                  </button>
                </div>

                {successMetrics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No hay métricas de éxito configuradas</p>
                    <p className="text-xs mt-1">Agrega métricas para medir el éxito de las llamadas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {successMetrics.map((metric, index) => (
                      <div key={metric.id} className="border border-gray-200 rounded-lg p-4 relative hover:border-green-300 transition-colors">
                        <button
                          onClick={() => removeSuccessMetric(index)}
                          className="absolute top-3 right-3 text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-3 pr-10">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nombre de la Métrica
                              </label>
                              <input
                                type="text"
                                value={metric.name}
                                onChange={(e) => updateSuccessMetric(index, { name: e.target.value })}
                                placeholder="Cita agendada"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tipo de Métrica
                              </label>
                              <select
                                value={metric.type}
                                onChange={(e) => updateSuccessMetric(index, {
                                  type: e.target.value as 'boolean' | 'duration' | 'text',
                                  custom_data_key: undefined,
                                  min_duration: undefined,
                                  expected_value: undefined
                                })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                              >
                                <option value="boolean">✓ Sí/No (Boolean)</option>
                                <option value="duration">⏱ Duración Mínima</option>
                                <option value="text">📝 Valor de Texto</option>
                              </select>
                            </div>
                          </div>

                          {metric.type === 'boolean' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Clave en Custom Data
                              </label>
                              <input
                                type="text"
                                value={metric.custom_data_key || ''}
                                onChange={(e) => updateSuccessMetric(index, { custom_data_key: e.target.value })}
                                placeholder="appointment_booked"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Se considerará exitosa si este campo es true en custom_data
                              </p>
                            </div>
                          )}

                          {metric.type === 'duration' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Duración Mínima (segundos)
                              </label>
                              <input
                                type="number"
                                value={metric.min_duration || ''}
                                onChange={(e) => updateSuccessMetric(index, { min_duration: parseInt(e.target.value) || 0 })}
                                placeholder="60"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Se considerará exitosa si la llamada dura al menos este tiempo
                              </p>
                            </div>
                          )}

                          {metric.type === 'text' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Clave en Custom Data
                                </label>
                                <input
                                  type="text"
                                  value={metric.custom_data_key || ''}
                                  onChange={(e) => updateSuccessMetric(index, { custom_data_key: e.target.value })}
                                  placeholder="appointment_status"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Valor Esperado
                                </label>
                                <input
                                  type="text"
                                  value={metric.expected_value || ''}
                                  onChange={(e) => updateSuccessMetric(index, { expected_value: e.target.value })}
                                  placeholder="confirmed"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Se considerará exitosa si este campo tiene exactamente este valor
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                  <p className="font-medium mb-1">💡 Cómo funcionan las métricas:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li><strong>Boolean (Sí/No):</strong> Se considera exitosa si el campo en custom_data es true</li>
                    <li><strong>Duración:</strong> Se considera exitosa si la llamada dura más del tiempo especificado</li>
                    <li><strong>Texto:</strong> Se considera exitosa si el campo custom_data contiene el valor esperado</li>
                    <li><strong>Analytics:</strong> Podrás ver la tasa de éxito basada en estas métricas en la página de Analytics</li>
                  </ul>
                </div>
              </div>

              {/* Sección de Custom Functions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-600" />
                      Conexiones con CRM o Calendario
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Conecta tu agente con servicios externos mediante webhooks
                    </p>
                  </div>
                  <button
                    onClick={addCustomFunction}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Conexión
                  </button>
                </div>

                {customFunctions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-dashed border-purple-200">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                    <p className="text-base font-medium">No hay conexiones configuradas</p>
                    <p className="text-sm mt-2">Conecta tu agente con CRM, calendarios u otros servicios</p>
                    <button
                      onClick={addCustomFunction}
                      className="mt-4 inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Primera Conexión
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customFunctions.map((func, index) => (
                      <div key={func.id} className="border-2 border-purple-200 rounded-lg p-5 relative hover:border-purple-400 transition-all bg-gradient-to-br from-white to-purple-50">
                        <button
                          onClick={() => removeCustomFunction(index)}
                          className="absolute top-3 right-3 text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-4 pr-10">
                          {/* Nombre y Estado */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                                Nombre para Mostrar
                              </label>
                              <input
                                type="text"
                                value={func.display_name}
                                onChange={(e) => updateCustomFunction(index, { display_name: e.target.value })}
                                placeholder="Agendar Cita en CRM"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Settings className="w-3.5 h-3.5 text-purple-600" />
                                Nombre de la Función
                              </label>
                              <input
                                type="text"
                                value={func.name}
                                onChange={(e) => updateCustomFunction(index, { name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                placeholder="agendar_cita"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Sin espacios, solo letras minúsculas y guiones bajos
                              </p>
                            </div>
                          </div>

                          {/* Descripción */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              📝 Descripción (qué hace y qué parámetros recibe)
                            </label>
                            <textarea
                              value={func.description}
                              onChange={(e) => updateCustomFunction(index, { description: e.target.value })}
                              placeholder="Esta función agenda una cita en el CRM. Recibe: nombre_paciente (string), telefono (string), fecha_preferida (string)"
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                          </div>

                          {/* URL del Webhook */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-purple-600" />
                              URL del Webhook
                            </label>
                            <input
                              type="url"
                              value={func.webhook_url}
                              onChange={(e) => updateCustomFunction(index, { webhook_url: e.target.value })}
                              placeholder="https://tu-crm.com/api/webhook"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                            />
                          </div>

                          {/* API Key / Contraseña */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-purple-600" />
                              Contraseña o API Key (opcional)
                            </label>
                            <div className="relative">
                              <input
                                type={showApiKeys[func.id] ? 'text' : 'password'}
                                value={func.api_key}
                                onChange={(e) => updateCustomFunction(index, { api_key: e.target.value })}
                                placeholder="sk_tu_api_key_secreta"
                                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => toggleApiKeyVisibility(func.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                              >
                                {showApiKeys[func.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Se enviará en el header Authorization: Bearer [tu_api_key]
                            </p>
                          </div>

                          {/* Estado Activo/Inactivo */}
                          <div className="flex items-center gap-2 pt-2 border-t border-purple-100">
                            <input
                              type="checkbox"
                              id={`enabled-${func.id}`}
                              checked={func.enabled}
                              onChange={(e) => updateCustomFunction(index, { enabled: e.target.checked })}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <label htmlFor={`enabled-${func.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                              {func.enabled ? '✅ Activa' : '❌ Desactivada'}
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4 text-xs text-purple-900">
                  <p className="font-medium mb-2">💡 Cómo funciona:</p>
                  <ul className="list-disc list-inside space-y-1.5 text-purple-800">
                    <li><strong>Súper fácil:</strong> Solo necesitas poner el nombre, la URL de tu webhook y listo</li>
                    <li><strong>Automático:</strong> El agente ejecutará esta función cuando sea necesario durante la llamada</li>
                    <li><strong>Datos enviados:</strong> Tu webhook recibirá los parámetros que describas en formato JSON</li>
                    <li><strong>Seguro:</strong> La API Key se envía en cada petición para autenticarte</li>
                    <li><strong>Prompt automático:</strong> Se añade automáticamente al prompt del agente - ¡no necesitas editarlo!</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Prompt del Sistema</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Instrucciones que guían el comportamiento del agente
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPromptEditor(!showPromptEditor)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    {showPromptEditor ? 'Ocultar' : 'Editar Prompt'}
                    {showPromptEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {!showPromptEditor ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      El prompt está configurado y funcionando. Haz clic en "Editar Prompt" para verlo o modificarlo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={25}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                      style={{ minHeight: '500px', background: '#fafafa' }}
                    />
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                      <p className="font-medium mb-1">💡 Formato del Prompt:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Usa formato Markdown con títulos (# y ##)</li>
                        <li>Escribe todo con letras, evita números y símbolos</li>
                        <li>Usa viñetas (-) en lugar de listas numeradas</li>
                        <li>Escribe números como palabras (uno, dos, tres...)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {selectedVoice && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Voz Seleccionada</h3>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <p className="text-lg font-bold text-blue-900">{selectedVoice.name}</p>
                    <p className="text-sm text-blue-700 mt-1">ElevenLabs Premium Voice</p>
                  </div>
                </div>
              )}

              {calcomEvents.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Cal.com Tools Activas</h3>
                  </div>
                  <div className="space-y-2">
                    {calcomEvents.map((event) => {
                      const isExpanded = expandedEventId === event.id;
                      const bookingUrl = `https://app.cal.com/event-types/${event.external_event_id}`;

                      return (
                        <div key={event.id} className="border border-green-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                            className="w-full p-3 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="font-medium text-gray-900 text-sm">{event.event_name}</span>
                              <span className="text-xs text-gray-600">({event.duration_minutes} min)</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="p-3 bg-white border-t border-green-200 space-y-2">
                              <div className="text-xs space-y-1.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-500 font-medium min-w-[70px]">Duración:</span>
                                  <span className="text-gray-900">{event.duration_minutes} minutos</span>
                                </div>

                                {event.description && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-gray-500 font-medium min-w-[70px]">Descripción:</span>
                                    <span className="text-gray-900">{event.description}</span>
                                  </div>
                                )}

                                <div className="flex items-start gap-2">
                                  <span className="text-gray-500 font-medium min-w-[70px]">Event ID:</span>
                                  <span className="text-gray-900 font-mono text-[10px]">{event.external_event_id}</span>
                                </div>

                                <div className="pt-2 mt-2 border-t border-gray-100">
                                  <a
                                    href={bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Ver en Cal.com →
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900 font-medium mb-1">✓ Tools disponibles:</p>
                      <ul className="text-xs text-blue-800 space-y-1 ml-3">
                        <li>• check_availability (consultar disponibilidad)</li>
                        <li>• book_appointment (reservar cita)</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => navigate(`/clinic/${clinicId}/calcom`)}
                      className="w-full px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Gestionar Cal.com
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Información del Agente</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Creado:</span>
                    <span className="text-gray-900 font-medium">{new Date(agent.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Actualizado:</span>
                    <span className="text-gray-900 font-medium">{new Date(agent.updated_at).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Transferencias:</span>
                    <span className="text-gray-900 font-medium">{transfers.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Cal.com Tools:</span>
                    <span className="text-gray-900 font-medium">{calcomEvents.length > 0 ? 'Activas' : 'No configuradas'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Voice ID:</span>
                    <span className="text-gray-900 font-mono text-xs">{agent.voice_id}</span>
                  </div>
                  <div className="py-2">
                    <span className="text-gray-600 block mb-1">Agent ID:</span>
                    <span className="text-gray-900 font-mono text-xs break-all">{agent.retell_agent_id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8" style={{ minHeight: '600px' }}>
            <WebPlayground agentId={agent.retell_agent_id} />
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Transferencias</h2>
                <p className="text-gray-600 mt-1">
                  Configura los números y personas a los que el agente puede transferir llamadas
                </p>
              </div>
              <button
                onClick={addTransfer}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Agregar Transferencia
              </button>
            </div>

            {transfers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay transferencias configuradas</p>
                <p className="text-sm mt-2">Agrega números de teléfono a los que el agente puede transferir llamadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 relative hover:border-purple-300 transition-colors">
                    <button
                      onClick={() => removeTransfer(index)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="space-y-4 pr-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Transferencia
                          </label>
                          <select
                            value={transfer.type}
                            onChange={(e) => updateTransfer(index, 'type', e.target.value as 'phone' | 'agent')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                          >
                            <option value="phone">📞 Transferencia a Teléfono</option>
                            <option value="agent">🤖 Transferencia a Agente IA</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre / Identificador
                          </label>
                          <input
                            type="text"
                            value={transfer.name}
                            onChange={(e) => updateTransfer(index, 'name', e.target.value)}
                            placeholder="Dr. García / Urgencias"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>
                      </div>

                      {transfer.type === 'phone' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de Teléfono
                          </label>
                          <input
                            type="tel"
                            value={transfer.phone}
                            onChange={(e) => updateTransfer(index, 'phone', e.target.value)}
                            placeholder="+34 600 123 456"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Agente
                          </label>
                          <select
                            value={transfer.agent_id || ''}
                            onChange={(e) => updateTransfer(index, 'agent_id', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                          >
                            <option value="">Selecciona un agente...</option>
                            {availableAgents.map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.name} ({ag.agent_type === 'inbound' ? 'Entrante' : 'Saliente'})
                              </option>
                            ))}
                          </select>
                          {availableAgents.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              No hay otros agentes disponibles. Crea más agentes para habilitar transferencias entre agentes.
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción / Cuándo transferir
                        </label>
                        <input
                          type="text"
                          value={transfer.description}
                          onChange={(e) => updateTransfer(index, 'description', e.target.value)}
                          placeholder="Para emergencias médicas urgentes"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Describe cuándo el agente debe realizar esta transferencia
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-medium mb-2">💡 Cómo funcionan las transferencias:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li><strong>Sistema automático:</strong> Cuando guardas, las transferencias se configuran automáticamente como herramientas del agente y se añaden al prompt</li>
                <li><strong>Dos tipos de transferencias:</strong>
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>📞 <strong>A Teléfono:</strong> Transfiere la llamada a un número de teléfono específico</li>
                    <li>🤖 <strong>A Agente IA:</strong> Transfiere la conversación a otro agente IA especializado de tu clínica</li>
                  </ul>
                </li>
                <li><strong>La descripción es clave:</strong> El agente usa la descripción para detectar cuándo debe transferir la llamada</li>
                <li><strong>Ejemplo:</strong> Si pones "Para emergencias médicas urgentes", el agente transferirá automáticamente cuando detecte una emergencia</li>
                <li><strong>Nombre claro:</strong> El agente usará el nombre que pongas para ejecutar la transferencia (ej: "Dr. García", "Urgencias", "Especialista en Pediatría")</li>
                <li><strong>Formato del número:</strong> Para transferencias telefónicas, incluye siempre el código de país completo (ej: +34 600 123 456)</li>
                <li><strong>Prompt automático:</strong> Se añade automáticamente una sección "#transferencias" al prompt con las instrucciones - ¡no necesitas editarlo manualmente!</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
