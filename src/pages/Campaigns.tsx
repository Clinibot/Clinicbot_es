import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, Users, CheckCircle, XCircle, Clock, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { getClinic } from '../services/clinicService';
import { getClinicCampaigns } from '../services/campaignService';
import { Campaign, Clinic } from '../types';

export default function Campaigns() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    loadData();
  }, [clinicId]);

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, campaignsData] = await Promise.all([
        getClinic(clinicId),
        getClinicCampaigns(clinicId),
      ]);
      setClinic(clinicData);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'executing': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'executing': return <Play className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'completed': return 'Completada';
      case 'executing': return 'En ejecución';
      case 'scheduled': return 'Programada';
      case 'failed': return 'Fallida';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/clinic/${clinicId}/calls`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver a Llamadas
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campañas de Llamadas</h1>
              <p className="text-sm text-gray-500">{clinic?.name}</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestiona tus Campañas</h3>
              <p className="text-sm text-gray-700 mb-3">
                Crea campañas reutilizables y lánzalas cuantas veces necesites con diferentes contactos.
              </p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Programa llamadas para una fecha y hora específica</p>
                <p>• Reutiliza campañas exitosas con nuevos contactos</p>
                <p>• Consulta el historial completo de cada campaña</p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay campañas aún</h3>
            <p className="text-gray-600 mb-6">
              Crea tu primera campaña desde "Hacer Llamadas" y aparecerá aquí para que puedas reutilizarla.
            </p>
            <button
              onClick={() => navigate(`/clinic/${clinicId}/calls`)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Ir a Hacer Llamadas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div className="p-6">
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {campaign.agent?.name || 'Agente eliminado'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(campaign.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Implement relaunch campaign
                        alert('Funcionalidad de relanzar campaña próximamente');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Relanzar
                    </button>
                  </div>

                  {/* Executions */}
                  {campaign.executions && campaign.executions.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Historial de Ejecuciones ({campaign.executions.length})
                      </h4>
                      <div className="space-y-2">
                        {campaign.executions.slice(0, 3).map((execution) => (
                          <div
                            key={execution.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                                {getStatusIcon(execution.status)}
                                {getStatusText(execution.status)}
                              </span>
                              <div className="text-sm text-gray-600">
                                {execution.scheduled_for ? (
                                  <span>Programada: {formatDate(execution.scheduled_for)}</span>
                                ) : execution.executed_at ? (
                                  <span>Ejecutada: {formatDate(execution.executed_at)}</span>
                                ) : (
                                  <span>Creada: {formatDate(execution.created_at)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1 text-gray-600">
                                <Users className="w-4 h-4" />
                                {execution.total_contacts}
                              </span>
                              {execution.status === 'completed' && (
                                <>
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    {execution.successful_calls}
                                  </span>
                                  {execution.failed_calls > 0 && (
                                    <span className="flex items-center gap-1 text-red-600">
                                      <XCircle className="w-4 h-4" />
                                      {execution.failed_calls}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {campaign.executions.length > 3 && (
                          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            Ver todas las ejecuciones ({campaign.executions.length})
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
