import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';
import { createPhoneRequest } from '../services/phoneRequestService';
import { Agent, Clinic } from '../types';

export default function ManagePhones() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPhone(agent: Agent, country: string) {
    if (!clinic || !clinicId) return;

    const confirmed = confirm(
      `¿Solicitar número virtual de ${country} para el agente "${agent.name}"?\n\n` +
      `Precio: ${country === 'España' ? '5€/mes' : 'Consultar'}`
    );

    if (!confirmed) return;

    setRequestingFor(agent.id);

    try {
      const requestNotes = `Solicitud de número virtual de ${country} para el agente "${agent.name}" (ID: ${agent.id})`;

      await createPhoneRequest(clinicId, requestNotes);

      alert(
        `✅ Solicitud enviada correctamente\n\n` +
        `Se ha solicitado un número virtual de ${country} para "${agent.name}".\n` +
        `El administrador revisará tu solicitud pronto.`
      );
    } catch (error) {
      alert('Error al solicitar número: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setRequestingFor(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/clinic/${clinicId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestionar Teléfonos Virtuales</h1>
              <p className="text-sm text-gray-500">{clinic?.name}</p>
            </div>
          </div>
        </div>

        {/* Información de Precios */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-6 h-6 text-green-600 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Números Virtuales</h3>
              <p className="text-sm text-gray-700 mb-3">
                Solicita números virtuales para tus agentes de IA y recibe llamadas en cualquier país.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Número virtual España: 5€/mes</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-gray-600">Otros países: Consultar disponibilidad y precio</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Cómo funciona</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Selecciona el agente para el que quieres solicitar un número</li>
            <li>Elige el país del número virtual</li>
            <li>Confirma la solicitud</li>
            <li>El administrador revisará y aprobará tu solicitud</li>
            <li>El número será asignado automáticamente a tu clínica</li>
          </ol>
        </div>

        {/* Lista de Agentes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Agentes de la Clínica</h2>
            <p className="text-sm text-gray-500 mt-1">
              {agents.length} {agents.length === 1 ? 'agente' : 'agentes'} disponibles
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {agents.length === 0 ? (
              <div className="p-12 text-center">
                <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay agentes creados todavía</p>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear Primer Agente
                </button>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agent.agent_type === 'inbound'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {agent.agent_type === 'inbound' ? 'Entrantes' : 'Salientes'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        ID del agente: <span className="font-mono text-xs">{agent.id}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleRequestPhone(agent, 'España')}
                        disabled={requestingFor === agent.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestingFor === agent.id ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            Solicitando...
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4" />
                            Número España (5€/mes)
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const country = prompt('¿De qué país necesitas el número?');
                          if (country) handleRequestPhone(agent, country);
                        }}
                        disabled={requestingFor === agent.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Phone className="w-4 h-4" />
                        Otro país (Consultar)
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nota adicional */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            <strong>Nota:</strong> Tu solicitud será revisada por el administrador. Una vez aprobada,
            el número virtual será asignado a tu clínica y se activará en un plazo de 24-48 horas.
          </p>
        </div>
      </div>
    </div>
  );
}
