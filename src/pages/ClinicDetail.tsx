import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Phone } from 'lucide-react';
import { getClinic } from '../services/clinicService';
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

  if (loading || !clinic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Información</h2>
            <div className="space-y-3 text-sm">
              {clinic.phone && <p><span className="font-medium">Tel:</span> {clinic.phone}</p>}
              {clinic.address && <p><span className="font-medium">Dir:</span> {clinic.address}</p>}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Agentes IA</h2>
              <button
                onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Crear Agente
              </button>
            </div>

            {agents.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-12 text-center">
                <Phone className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sin agentes</h3>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mt-4"
                >
                  <Plus className="w-5 h-5" />
                  Crear Primer Agente
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => navigate(`/clinic/${clinicId}/agent/${agent.id}`)}
                    className="bg-white rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl cursor-pointer p-6"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{agent.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${agent.agent_type === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
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
