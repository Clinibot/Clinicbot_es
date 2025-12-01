import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Play, Phone, Plus, X, Settings, TestTube } from 'lucide-react';
import { getAgent, updateAgent, deleteAgent, LANGUAGES } from '../services/agentService';
import { updateRetellAgent, deleteRetellAgent } from '../services/retellService';
import { Agent } from '../types';

interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender?: string;
  language?: string;
  accent?: string;
}

interface Transfer {
  name: string;
  phone: string;
  description: string;
}

export default function AgentDetail() {
  const { clinicId, agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'playground' | 'transfers'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [language, setLanguage] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [voiceFilter, setVoiceFilter] = useState({ provider: '', gender: '', language: '' });
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [playgroundMessage, setPlaygroundMessage] = useState('');

  useEffect(() => {
    loadAgent();
    loadVoices();
  }, [agentId]);

  useEffect(() => {
    filterVoices();
  }, [voiceFilter, availableVoices, language]);

  async function loadAgent() {
    if (!agentId) return;
    try {
      const data = await getAgent(agentId);
      if (data) {
        setAgent(data);
        setName(data.name);
        setPrompt(data.prompt);
        setVoiceId(data.voice_id);
        setLanguage(data.language);
        setTransfers(data.transfers || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadVoices() {
    setLoadingVoices(true);
    try {
      const response = await fetch('https://api.retellai.com/list-voices', {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_RETELL_API_KEY}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableVoices(data.voices || []);
      }
    } catch (err) {
      console.error('Error loading voices:', err);
    } finally {
      setLoadingVoices(false);
    }
  }

  function filterVoices() {
    let filtered = [...availableVoices];

    if (voiceFilter.provider) {
      filtered = filtered.filter(v => v.provider.toLowerCase().includes(voiceFilter.provider.toLowerCase()));
    }

    if (voiceFilter.gender) {
      filtered = filtered.filter(v => v.gender?.toLowerCase() === voiceFilter.gender.toLowerCase());
    }

    if (language && language !== 'multi') {
      const langCode = language.split('-')[0];
      filtered = filtered.filter(v =>
        v.language?.toLowerCase().includes(langCode.toLowerCase()) ||
        v.voice_id.toLowerCase().includes(langCode)
      );
    }

    setFilteredVoices(filtered);
  }

  async function handleSave() {
    if (!agent || !agentId) return;
    setSaving(true);
    try {
      const updatedPrompt = buildPromptWithTransfers();
      await updateRetellAgent(agent.retell_agent_id, { name, prompt: updatedPrompt, voiceId, language });
      await updateAgent(agentId, { name, prompt: updatedPrompt, voice_id: voiceId, language, transfers });
      await loadAgent();
      alert('Agente actualizado correctamente');
    } catch (err) {
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  function buildPromptWithTransfers() {
    if (transfers.length === 0) return prompt;

    const transferSection = `

Transferencias disponibles:
${transfers.map((t, i) => `${i + 1}. ${t.name} (${t.phone}): ${t.description}`).join('\n')}

Cuando un paciente necesite hablar con una de estas personas o departamentos, explica que puedes transferir la llamada y pregunta si desea que lo hagas ahora.`;

    return prompt + transferSection;
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
    setTransfers([...transfers, { name: '', phone: '', description: '' }]);
  }

  function removeTransfer(index: number) {
    setTransfers(transfers.filter((_, i) => i !== index));
  }

  function updateTransfer(index: number, field: keyof Transfer, value: string) {
    const updated = [...transfers];
    updated[index][field] = value;
    setTransfers(updated);
  }

  async function handleTestCall() {
    if (!testPhoneNumber || !agent) {
      alert('Por favor ingresa un número de teléfono');
      return;
    }
    alert('Funcionalidad de llamada de prueba pendiente de implementación con Retell API');
  }

  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedVoice = availableVoices.find(v => v.voice_id === voiceId);

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
              <p className="text-sm text-gray-500">ID: {agent.retell_agent_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
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
            <TestTube className="w-5 h-5" />
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
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-2">Prompt del Sistema</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Instrucciones que guían el comportamiento del agente durante las llamadas.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={25}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                  style={{ minHeight: '500px', background: '#fafafa' }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Configuración de Voz</h2>

                {selectedVoice && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-gray-700">Voz Actual:</p>
                    <p className="text-lg font-bold text-blue-900">{selectedVoice.voice_name}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-gray-600">Proveedor: <span className="font-medium">{selectedVoice.provider}</span></p>
                      {selectedVoice.gender && <p className="text-gray-600">Género: <span className="font-medium">{selectedVoice.gender}</span></p>}
                      {selectedVoice.accent && <p className="text-gray-600">Acento: <span className="font-medium">{selectedVoice.accent}</span></p>}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                    <select
                      value={voiceFilter.provider}
                      onChange={(e) => setVoiceFilter({ ...voiceFilter, provider: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Todos</option>
                      <option value="elevenlabs">ElevenLabs</option>
                      <option value="openai">OpenAI</option>
                      <option value="deepgram">Deepgram</option>
                      <option value="playht">PlayHT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Género</label>
                    <select
                      value={voiceFilter.gender}
                      onChange={(e) => setVoiceFilter({ ...voiceFilter, gender: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Todos</option>
                      <option value="male">Masculino</option>
                      <option value="female">Femenino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Voces Disponibles {loadingVoices && <span className="text-blue-600">(Cargando...)</span>}
                    </label>
                    <select
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 max-h-60"
                      size={8}
                    >
                      {(filteredVoices.length > 0 ? filteredVoices : availableVoices).map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.voice_name} ({v.provider})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {filteredVoices.length || availableVoices.length} voces disponibles
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Estado del Agente</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Estado:</span>
                    <span className={`font-medium ${agent.enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {agent.enabled ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Creado:</span>
                    <span className="text-blue-900 font-medium">{new Date(agent.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Actualizado:</span>
                    <span className="text-blue-900 font-medium">{new Date(agent.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-2">Playground de Pruebas</h2>
            <p className="text-gray-600 mb-6">
              Prueba tu agente en tiempo real realizando una llamada de prueba
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Llamada de Prueba</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Teléfono
                    </label>
                    <input
                      type="tel"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="+34 600 123 456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Incluye código de país</p>
                  </div>

                  <button
                    onClick={handleTestCall}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    Iniciar Llamada de Prueba
                  </button>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    <p className="font-medium">Nota:</p>
                    <p>Se realizará una llamada real al número proporcionado. Asegúrate de tener el agente configurado correctamente.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">Vista Previa de Configuración</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Agente:</span>
                    <span className="ml-2 font-medium">{name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Voz:</span>
                    <span className="ml-2 font-medium">{selectedVoice?.voice_name || voiceId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Idioma:</span>
                    <span className="ml-2 font-medium">{LANGUAGES.find(l => l.id === language)?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 font-medium">
                      {agent.agent_type === 'inbound' ? 'Entrantes' : 'Salientes'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Consejo:</strong> Prueba diferentes escenarios de conversación para verificar que el agente responde correctamente según tu prompt.
                  </p>
                </div>
              </div>
            </div>
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
                  <div key={index} className="border border-gray-200 rounded-lg p-6 relative">
                    <button
                      onClick={() => removeTransfer(index)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre / Departamento
                        </label>
                        <input
                          type="text"
                          value={transfer.name}
                          onChange={(e) => updateTransfer(index, 'name', e.target.value)}
                          placeholder="Dr. García / Recepción"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>

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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={transfer.description}
                          onChange={(e) => updateTransfer(index, 'description', e.target.value)}
                          placeholder="Para emergencias médicas"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
              <p className="font-medium mb-2">ℹ️ Información sobre Transferencias</p>
              <ul className="list-disc list-inside space-y-1 text-purple-800">
                <li>Las transferencias se agregarán automáticamente al prompt del agente</li>
                <li>El agente preguntará antes de realizar una transferencia</li>
                <li>Asegúrate de que los números incluyan el código de país completo</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
