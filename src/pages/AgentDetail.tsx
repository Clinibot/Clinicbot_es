import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Phone, Plus, X, Settings, MessageSquare, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { getAgent, updateAgent, deleteAgent, VOICES, LANGUAGES } from '../services/agentService';
import { updateRetellAgent, deleteRetellAgent } from '../services/retellService';
import { Agent } from '../types';
import WebPlayground from '../components/WebPlayground';

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
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [language, setLanguage] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([]);

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
        setTransfers(data.transfers || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!agent || !agentId) return;
    setSaving(true);
    try {
      await updateRetellAgent(agent.retell_agent_id, {
        name,
        prompt,
        voiceId,
        language,
        transfers: transfers.length > 0 ? transfers : undefined
      });
      await updateAgent(agentId, { name, prompt, voice_id: voiceId, language, transfers });
      await loadAgent();
      setShowPromptEditor(false);
      alert('Agente actualizado correctamente');
    } catch (err) {
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
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Transferencias:</span>
                    <span className="text-gray-900 font-medium">{transfers.length}</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-12">
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

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-medium mb-2">💡 Cómo funcionan las transferencias:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li><strong>Sistema automático:</strong> Cuando guardas, las transferencias se configuran automáticamente como herramientas del agente</li>
                <li><strong>La descripción es clave:</strong> El agente usa la descripción para detectar cuándo debe transferir la llamada</li>
                <li><strong>Ejemplo:</strong> Si pones "Para emergencias médicas urgentes", el agente transferirá automáticamente cuando detecte una emergencia</li>
                <li><strong>Nombre claro:</strong> El agente usará el nombre que pongas para ejecutar la transferencia (ej: "Dr. García", "Urgencias")</li>
                <li><strong>Formato del número:</strong> Incluye siempre el código de país completo (ej: +34 600 123 456)</li>
                <li>No necesitas modificar el prompt manualmente - todo se configura automáticamente</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
