import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { getAgent, updateAgent, deleteAgent, VOICES, LANGUAGES } from '../services/agentService';
import { updateRetellAgent, deleteRetellAgent } from '../services/retellService';
import { Agent } from '../types';

export default function AgentDetail() {
  const { clinicId, agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [language, setLanguage] = useState('');

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
        setVoiceId(data.voice_id);
        setLanguage(data.language);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!agent || !agentId) return;
    setSaving(true);
    try {
      await updateRetellAgent(agent.retell_agent_id, { name, prompt, voiceId, language });
      await updateAgent(agentId, { name, prompt, voice_id: voiceId, language });
      await loadAgent();
      setEditing(false);
    } catch (err) {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!agent || !agentId || !confirm('¿Eliminar este agente?')) return;
    try {
      await deleteRetellAgent(agent.retell_agent_id);
      await deleteAgent(agentId);
      navigate(`/clinic/${clinicId}`);
    } catch (err) {
      alert('Error al eliminar');
    }
  }

  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/clinic/${clinicId}`)} className="flex items-center gap-2 text-gray-600">
              <ArrowLeft className="w-5 h-5" />
              Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
          </div>
          <button onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8">
          {!editing ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nombre</p>
                <p className="text-lg font-bold">{agent.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tipo</p>
                <span className={`px-3 py-1 rounded-full text-sm ${agent.agent_type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                  {agent.agent_type === 'inbound' ? 'Entrantes' : 'Salientes'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Voz</p>
                <p>{agent.voice_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Idioma</p>
                <p>{agent.language}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Prompt</p>
                <p className="whitespace-pre-wrap">{agent.prompt}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Editar Configuración
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Voz</label>
                  <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                    {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Idioma</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                    {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 border-2 border-gray-200 py-3 rounded-lg hover:border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
