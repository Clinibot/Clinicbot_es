import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Plus, CheckCircle, XCircle, AlertCircle, Link as LinkIcon, Unlink } from 'lucide-react';
import { getClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';
import { createPhoneRequest } from '../services/phoneRequestService';
import { getClinicPhoneNumbers, assignPhoneToAgent, unassignPhoneFromAgent } from '../services/phoneNumberService';
import { Agent, Clinic, PhoneNumber } from '../types';

export default function ManagePhones() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [clinicId]);

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, agentsData, phoneNumbersData] = await Promise.all([
        getClinic(clinicId),
        getClinicAgents(clinicId),
        getClinicPhoneNumbers(clinicId),
      ]);
      setClinic(clinicData);
      setAgents(agentsData || []);
      setPhoneNumbers(phoneNumbersData || []);
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
      const requestNotes = `Solicitud de número virtual de ${country} para el agente "${agent.name}" (Tipo: ${agent.agent_type === 'inbound' ? 'Entrante' : 'Saliente'})`;

      await createPhoneRequest(clinicId, agent.id, requestNotes);

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

  async function handleAssignPhone(phoneNumberId: string, agentId: string, agentType: 'inbound' | 'outbound') {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const phoneNumber = phoneNumbers.find(p => p.id === phoneNumberId);
    if (!phoneNumber) return;

    const confirmed = confirm(
      `¿Asignar el número ${phoneNumber.phone_number} al agente "${agent.name}" (${agentType === 'inbound' ? 'Entrante' : 'Saliente'})?`
    );

    if (!confirmed) return;

    try {
      await assignPhoneToAgent(phoneNumberId, agentId, agentType);
      await loadData(); // Reload data
      alert('✅ Teléfono asignado correctamente');
    } catch (error) {
      alert('Error al asignar teléfono: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      console.error(error);
    }
  }

  async function handleUnassignPhone(phoneNumberId: string, agentType: 'inbound' | 'outbound') {
    const confirmed = confirm(`¿Desasignar este teléfono del agente ${agentType === 'inbound' ? 'entrante' : 'saliente'}?`);
    if (!confirmed) return;

    try {
      await unassignPhoneFromAgent(phoneNumberId, agentType);
      await loadData(); // Reload data
      alert('✅ Teléfono desasignado correctamente');
    } catch (error) {
      alert('Error al desasignar teléfono: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      console.error(error);
    }
  }

  function getAvailableAgentsForPhone(phone: PhoneNumber, agentType: 'inbound' | 'outbound'): Agent[] {
    // Get agents of the specified type that don't have this phone assigned
    return agents.filter(agent => {
      if (agent.agent_type !== agentType) return false;

      // Check if agent already has a different phone assigned
      const hasPhoneAssigned = phoneNumbers.some(p =>
        agentType === 'inbound' ? p.assigned_inbound_agent_id === agent.id : p.assigned_outbound_agent_id === agent.id
      );

      return !hasPhoneAssigned;
    });
  }

  function getAssignedAgent(phone: PhoneNumber, agentType: 'inbound' | 'outbound'): Agent | undefined {
    const agentId = agentType === 'inbound' ? phone.assigned_inbound_agent_id : phone.assigned_outbound_agent_id;
    return agents.find(a => a.id === agentId);
  }

  if (loading) {
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
          <button
            onClick={() => navigate(`/clinic/${clinicId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">Gestionar Teléfonos</h1>
            {clinic && <p className="text-sm text-gray-500">{clinic.name}</p>}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Números Virtuales</h3>
              <p className="text-sm text-gray-700 mb-3">
                Gestiona los teléfonos comprados y asígnalos a tus agentes de IA.
              </p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Cada teléfono puede tener 1 agente entrante + 1 agente saliente</p>
                <p>• El agente entrante recibirá las llamadas al número</p>
                <p>• El agente saliente podrá hacer llamadas desde el número</p>
              </div>
            </div>
          </div>
        </div>

        {/* Purchased Phones */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Teléfonos Comprados ({phoneNumbers.length})</h2>
          </div>

          {phoneNumbers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No tienes teléfonos comprados</h3>
              <p className="text-sm text-gray-500 mb-4">
                Solicita tu primer número virtual para comenzar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {phoneNumbers.map((phone) => {
                const inboundAgent = getAssignedAgent(phone, 'inbound');
                const outboundAgent = getAssignedAgent(phone, 'outbound');
                const availableInbound = getAvailableAgentsForPhone(phone, 'inbound');
                const availableOutbound = getAvailableAgentsForPhone(phone, 'outbound');

                return (
                  <div
                    key={phone.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Phone className="w-5 h-5 text-blue-600" />
                          {phone.phone_number}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {phone.country}
                          </span>
                          {phone.monthly_cost && (
                            <span className="font-medium">{phone.monthly_cost}€/mes</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Inbound Agent */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Agente Entrante</h4>
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                            Recibe llamadas
                          </span>
                        </div>
                        {inboundAgent ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">{inboundAgent.name}</span>
                            </div>
                            <button
                              onClick={() => handleUnassignPhone(phone.id, 'inbound')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Desasignar"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <select
                            onChange={(e) => e.target.value && handleAssignPhone(phone.id, e.target.value, 'inbound')}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            value=""
                          >
                            <option value="">Seleccionar agente...</option>
                            {availableInbound.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {!inboundAgent && availableInbound.length === 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            No hay agentes entrantes disponibles
                          </p>
                        )}
                      </div>

                      {/* Outbound Agent */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Agente Saliente</h4>
                          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-medium">
                            Hace llamadas
                          </span>
                        </div>
                        {outboundAgent ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">{outboundAgent.name}</span>
                            </div>
                            <button
                              onClick={() => handleUnassignPhone(phone.id, 'outbound')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Desasignar"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <select
                            onChange={(e) => e.target.value && handleAssignPhone(phone.id, e.target.value, 'outbound')}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            value=""
                          >
                            <option value="">Seleccionar agente...</option>
                            {availableOutbound.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {!outboundAgent && availableOutbound.length === 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            No hay agentes salientes disponibles
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Request New Phone */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Solicitar Nuevo Teléfono
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona el agente para el que necesitas un número virtual
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {agents.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No hay agentes creados todavía</p>
                <button
                  onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
                  className="px-4 py-2 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
                >
                  Crear Primer Agente
                </button>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{agent.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          agent.agent_type === 'inbound'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {agent.agent_type === 'inbound' ? 'Entrante' : 'Saliente'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {agent.agent_type === 'inbound' ? 'Recibirá llamadas' : 'Hará llamadas'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestPhone(agent, 'España')}
                        disabled={requestingFor === agent.id}
                        className="px-4 py-2 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestingFor === agent.id ? 'Solicitando...' : 'España (5€/mes)'}
                      </button>
                      <button
                        onClick={() => {
                          const country = prompt('¿De qué país necesitas el número?');
                          if (country) handleRequestPhone(agent, country);
                        }}
                        disabled={requestingFor === agent.id}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Otro país
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Help Note */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            <strong>Nota:</strong> Las solicitudes de teléfono serán revisadas por el administrador. Una vez aprobadas,
            el número aparecerá en esta página y podrás asignarlo a tus agentes. Recuerda que cada teléfono solo puede
            tener un agente entrante y un agente saliente asignado.
          </p>
        </div>
      </div>
    </div>
  );
}
