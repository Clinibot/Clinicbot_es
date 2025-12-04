import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Phone, Edit, Trash2, Calendar, BarChart3 } from 'lucide-react';
import { getClinic, deleteClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';
import { Clinic, Agent } from '../types';

export default function ClinicDetail() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clinicId]);

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, agentsData] = await Promise.all([
        getClinic(clinicId),
        getClinicAgents(clinicId),
      ]);
      setClinic(clinicData);
      setAgents(agentsData || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!clinicId || !clinic) return;
    const confirmed = confirm(`¿Estás seguro de que deseas eliminar la clínica "${clinic.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      await deleteClinic(clinicId);
      navigate('/dashboard');
    } catch (err) {
      alert('Error al eliminar la clínica');
    }
  }

  if (loading || !clinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">{clinic.name}</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Información</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/edit`)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar clínica"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Eliminar clínica"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              {clinic.phone && <p><span className="font-medium text-gray-900">Tel:</span> {clinic.phone}</p>}
              {clinic.address && <p><span className="font-medium text-gray-900">Dir:</span> {clinic.address}</p>}
              {clinic.city && <p><span className="font-medium text-gray-900">Ciudad:</span> {clinic.city}</p>}
              {clinic.website && (
                <p>
                  <span className="font-medium text-gray-900">Web:</span>{' '}
                  <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline">
                    {clinic.website}
                  </a>
                </p>
              )}
              {clinic.specialties && clinic.specialties.length > 0 && (
                <div>
                  <p className="font-medium text-gray-900 mb-2">Especialidades:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.specialties.map((spec, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">{spec}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/calcom`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md active:shadow-inner"
                >
                  <Calendar className="w-4 h-4" />
                  Configurar Cal.com
                </button>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/analytics`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shadow hover:shadow-md active:shadow-inner"
                >
                  <BarChart3 className="w-4 h-4" />
                  Ver Analíticas
                </button>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/phones`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-400 hover:bg-blue-400 hover:text-white hover:border-blue-400 transition-all shadow hover:shadow-md active:shadow-inner"
                >
                  <Phone className="w-4 h-4" />
                  Gestionar Teléfonos
                </button>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/calls`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-all shadow hover:shadow-md active:shadow-inner"
                >
                  <Phone className="w-4 h-4" />
                  Hacer Llamadas
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Agentes IA</h2>
              <button
                onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
                className="flex items-center gap-2 bg-gray-50 text-gray-900 font-semibold px-5 py-2.5 rounded-lg border-2 border-blue-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Crear Agente
              </button>
            </div>

            {agents.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Phone className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin agentes</h3>
                <p className="text-sm text-gray-500 mb-4">Crea tu primer agente IA para comenzar</p>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
                  className="inline-flex items-center gap-2 bg-gray-50 text-gray-900 font-semibold px-6 py-3 rounded-lg border-2 border-blue-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Crear Agente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => navigate(`/clinic/${clinicId}/agent/${agent.id}`)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer p-5 transition-all"
                  >
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{agent.name}</h3>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${agent.agent_type === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {agent.agent_type === 'inbound' ? 'Entrantes' : 'Salientes'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
