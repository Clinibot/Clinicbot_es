import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, CheckCircle, XCircle, Clock, Edit, Trash2, User, Mail } from 'lucide-react';
import { getAllPhoneRequests, approvePhoneRequest, rejectPhoneRequest, deletePhoneRequest } from '../services/phoneRequestService';
import { getClinic } from '../services/clinicService';
import { getAgent } from '../services/agentService';
import { PhoneRequest, Clinic, Agent } from '../types';

interface PhoneRequestWithDetails extends PhoneRequest {
  clinic?: Clinic;
  agent?: Agent;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PhoneRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const requestsData = await getAllPhoneRequests();

      // Load clinic and agent data for each request
      const requestsWithDetails = await Promise.all(
        requestsData.map(async (request) => {
          const [clinic, agent] = await Promise.all([
            getClinic(request.clinic_id),
            request.agent_id ? getAgent(request.agent_id) : null
          ]);
          return { ...request, clinic, agent: agent || undefined };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    const phoneNumber = prompt('Introduce el número de teléfono a asignar (ej: +34612345678):');
    if (!phoneNumber) return;

    const country = prompt('País del número (ej: España):');
    if (!country) return;

    const costStr = prompt('Costo mensual en euros (ej: 5):');
    if (!costStr) return;
    const monthlyCost = parseFloat(costStr);
    if (isNaN(monthlyCost)) {
      alert('El costo debe ser un número válido');
      return;
    }

    const adminNotes = prompt('Notas del administrador (opcional):') || undefined;

    try {
      await approvePhoneRequest(requestId, phoneNumber, country, monthlyCost, adminNotes);
      await loadData(); // Reload data
      alert('✅ Solicitud aprobada y teléfono asignado al agente');
    } catch (error) {
      alert('Error al aprobar la solicitud: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      console.error(error);
    }
  }

  async function handleReject(requestId: string) {
    const adminNotes = prompt('Motivo del rechazo (opcional):') || undefined;

    const confirmed = confirm('¿Estás seguro de que deseas rechazar esta solicitud?');
    if (!confirmed) return;

    try {
      await rejectPhoneRequest(requestId, adminNotes);
      await loadData(); // Reload data
    } catch (error) {
      alert('Error al rechazar la solicitud');
      console.error(error);
    }
  }

  async function handleDelete(requestId: string) {
    const confirmed = confirm('¿Estás seguro de que deseas eliminar esta solicitud?');
    if (!confirmed) return;

    try {
      await deletePhoneRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error) {
      alert('Error al eliminar la solicitud');
      console.error(error);
    }
  }

  function getStatusColor(status: PhoneRequest['status']) {
    switch (status) {
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  function getStatusIcon(status: PhoneRequest['status']) {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  }

  function getStatusLabel(status: PhoneRequest['status']) {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-500">Gestión de solicitudes de teléfono</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Pendientes ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'approved'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Aprobadas ({requests.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'rejected'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Rechazadas ({requests.filter(r => r.status === 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Todas ({requests.length})
          </button>
        </div>

        {/* Requests list */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No hay solicitudes {filter !== 'all' && getStatusLabel(filter).toLowerCase()}
            </h3>
            <p className="text-sm text-gray-500">
              Las solicitudes aparecerán aquí cuando los usuarios las envíen
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.clinic?.name || 'Clínica desconocida'}
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {getStatusLabel(request.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">Usuario:</span>
                          <span>{request.user_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">Email:</span>
                          <span className="text-blue-600">{request.user_email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">Agente:</span>
                          <span>{request.agent?.name || 'N/A'}</span>
                          {request.agent && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${request.agent.agent_type === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                              {request.agent.agent_type === 'inbound' ? 'Entrante' : 'Saliente'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">Fecha:</span> {formatDate(request.created_at)}
                        </p>
                        {request.request_notes && (
                          <p>
                            <span className="font-medium">Notas:</span> {request.request_notes}
                          </p>
                        )}
                        {request.phone_number && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="font-medium">Asignado:</span>
                            <span className="text-green-600 font-semibold">{request.phone_number}</span>
                          </p>
                        )}
                        {request.admin_notes && (
                          <p>
                            <span className="font-medium">Admin:</span> {request.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                          title="Aprobar solicitud"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                          title="Rechazar solicitud"
                        >
                          <XCircle className="w-4 h-4" />
                          Rechazar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Eliminar solicitud"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
