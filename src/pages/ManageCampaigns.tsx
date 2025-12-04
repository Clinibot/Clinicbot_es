import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Phone, Calendar, Users, Trash2, Edit, Play, Pause, CheckCircle, Clock } from 'lucide-react';
import { getClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';
import { getClinicCampaigns, deleteCampaign } from '../services/campaignService';
import { Campaign, Agent, Clinic } from '../types';

export default function ManageCampaigns() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clinicId]);

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, agentsData, campaignsData] = await Promise.all([
        getClinic(clinicId),
        getClinicAgents(clinicId),
        getClinicCampaigns(clinicId),
      ]);
      setClinic(clinicData);
      setAgents(agentsData || []);
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(campaignId: string, campaignName: string) {
    const confirmed = confirm(`¿Estás seguro de que deseas eliminar la campaña "${campaignName}"?`);
    if (!confirmed) return;

    try {
      await deleteCampaign(campaignId);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (error) {
      alert('Error al eliminar la campaña');
      console.error(error);
    }
  }

  function getStatusColor(status: Campaign['status']) {
    switch (status) {
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  function getStatusIcon(status: Campaign['status']) {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <Pause className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  }

  function getStatusLabel(status: Campaign['status']) {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
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

  function getCompletedCalls(campaign: Campaign): number {
    return campaign.recipients.filter(r => r.call_status === 'completed').length;
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
            <h1 className="text-2xl font-semibold text-gray-900">Campañas Programadas</h1>
            {clinic && <p className="text-sm text-gray-500">{clinic.name}</p>}
          </div>
          <button
            onClick={() => navigate(`/clinic/${clinicId}/campaigns/create`)}
            className="flex items-center gap-2 bg-gray-50 text-gray-900 font-semibold px-5 py-2.5 rounded-lg border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Nueva Campaña
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Calendar className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay campañas programadas</h3>
            <p className="text-sm text-gray-500 mb-4">
              Crea tu primera campaña para programar llamadas automáticas
            </p>
            <button
              onClick={() => navigate(`/clinic/${clinicId}/campaigns/create`)}
              className="inline-flex items-center gap-2 bg-gray-50 text-gray-900 font-semibold px-6 py-3 rounded-lg border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Nueva Campaña
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((campaign) => {
              const agent = agents.find(a => a.id === campaign.agent_id);
              const completedCalls = getCompletedCalls(campaign);
              const totalCalls = campaign.recipients.length;
              const progress = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          {getStatusLabel(campaign.status)}
                        </span>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Agente:</span>
                          <span>{agent?.name || 'Desconocido'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Programada:</span>
                          <span>{formatDate(campaign.scheduled_for)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Contactos:</span>
                          <span>{totalCalls}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/clinic/${clinicId}/campaigns/${campaign.id}/edit`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar campaña"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id, campaign.name)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Eliminar campaña"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {campaign.status !== 'cancelled' && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-2">
                        <span>Progreso de llamadas</span>
                        <span>{completedCalls} / {totalCalls} completadas</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
