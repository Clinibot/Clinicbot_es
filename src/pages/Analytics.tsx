import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Clock, DollarSign, TrendingUp, RefreshCw, FileText, User, Calendar } from 'lucide-react';
import { getCallHistory, getCallAnalytics, syncCallsForClinic, CallRecord, CallAnalytics } from '../services/callHistoryService';
import { getClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';
import { Agent } from '../types';

type DateFilter = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function Analytics() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<any>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [clinicId, dateFilter, customStartDate, customEndDate, selectedAgentId]);

  function getDateRange(): { start: Date | null; end: Date | null } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return { start: today, end: now };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: now };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo, end: now };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + 'T23:59:59'),
          };
        }
        return { start: null, end: null };
      case 'all':
      default:
        return { start: null, end: null };
    }
  }

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, allCallsData, agentsData] = await Promise.all([
        getClinic(clinicId),
        getCallHistory(clinicId, { limit: 1000 }),
        getClinicAgents(clinicId),
      ]);

      setClinic(clinicData);
      setAgents(agentsData);

      // El markup ya está aplicado en el backend, no aplicar de nuevo
      // Filtrar por rango de fechas
      const { start, end } = getDateRange();
      let filteredCalls = allCallsData;

      if (start && end) {
        filteredCalls = allCallsData.filter(call => {
          const callDate = new Date(call.started_at);
          return callDate >= start && callDate <= end;
        });
      }

      // Filtrar por agente si se ha seleccionado uno específico
      if (selectedAgentId !== 'all') {
        filteredCalls = filteredCalls.filter(call => call.agent_id === selectedAgentId);
      }

      setCalls(filteredCalls);

      // Calcular analytics con los datos filtrados
      const analyticsData: CallAnalytics = {
        totalCalls: filteredCalls.length,
        totalDuration: filteredCalls.reduce((sum, call) => sum + call.duration_seconds, 0),
        totalCost: filteredCalls.reduce((sum, call) => sum + call.user_cost, 0),
        avgDuration:
          filteredCalls.length > 0
            ? filteredCalls.reduce((sum, call) => sum + call.duration_seconds, 0) / filteredCalls.length
            : 0,
        completedCalls: filteredCalls.filter(c => c.call_status === 'completed').length,
        missedCalls: filteredCalls.filter(c => c.call_status === 'missed' || c.call_status === 'no-answer').length,
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!clinicId) return;
    setSyncing(true);
    try {
      await syncCallsForClinic(clinicId);
      await loadData();
      alert('Llamadas sincronizadas correctamente');
    } catch (error) {
      alert('Error al sincronizar llamadas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setSyncing(false);
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  const filteredCalls = calls;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-2xl font-bold text-gray-900">Analíticas de Llamadas</h1>
              <p className="text-sm text-gray-500">{clinic?.name}</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Filtros de Fecha */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filtrar por Fecha</h3>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'week'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Última Semana
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Último Mes
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'custom'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personalizado
            </button>

            {dateFilter === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 font-medium">Desde:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 font-medium">Hasta:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <Phone className="w-8 h-8 text-blue-600" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Total Llamadas</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalCalls}</p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.completedCalls} completadas, {analytics.missedCalls} perdidas
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Tiempo Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.floor(analytics.totalDuration / 60)}m
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Promedio: {formatDuration(Math.floor(analytics.avgDuration))}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Coste Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(analytics.totalCost)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.totalCalls > 0
                  ? formatCurrency(analytics.totalCost / analytics.totalCalls)
                  : '€0,00'}{' '}
                por llamada
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Tasa de Éxito</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.totalCalls > 0
                  ? Math.round((analytics.completedCalls / analytics.totalCalls) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500 mt-2">
                De {analytics.totalCalls} llamadas totales
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Llamadas</h2>

              {/* Botones de Agente */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Agente:</span>
                <button
                  onClick={() => setSelectedAgentId('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedAgentId === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedAgentId === agent.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Llamante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sentimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coste
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No hay llamadas registradas
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            {call.call_type === 'web_call' ? (
                              <div className="text-sm font-medium text-blue-600">Llamada de prueba</div>
                            ) : (
                              <>
                                <div className="text-sm font-medium text-gray-900">
                                  {call.caller_phone || 'Desconocido'}
                                </div>
                                {call.caller_name && (
                                  <div className="text-xs text-gray-500">{call.caller_name}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.agent?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(call.started_at).toLocaleString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.metadata?.sentiment ? (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              call.metadata.sentiment.toLowerCase() === 'positive'
                                ? 'bg-green-100 text-green-800'
                                : call.metadata.sentiment.toLowerCase() === 'negative'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {call.metadata.sentiment.toLowerCase() === 'positive'
                              ? 'Positivo'
                              : call.metadata.sentiment.toLowerCase() === 'negative'
                              ? 'Negativo'
                              : 'Neutral'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(call.user_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          {expandedCallId === call.id ? '▼' : '▶'} Ver detalles
                        </button>
                      </td>
                    </tr>
                    {expandedCallId === call.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="space-y-4">
                            {/* Header con info principal */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-gray-200">
                              <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">Teléfono</p>
                                <p className="text-sm font-semibold text-gray-900">{call.caller_phone || 'Desconocido'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">Duración</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDuration(call.duration_seconds)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">Coste (con 20% incremento)</p>
                                <p className="text-sm font-semibold text-green-700">{formatCurrency(call.user_cost)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">Sentimiento</p>
                                {call.metadata?.sentiment ? (
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    call.metadata.sentiment.toLowerCase() === 'positive'
                                      ? 'bg-green-100 text-green-800'
                                      : call.metadata.sentiment.toLowerCase() === 'negative'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {call.metadata.sentiment.toLowerCase() === 'positive' ? 'Positivo' : call.metadata.sentiment.toLowerCase() === 'negative' ? 'Negativo' : 'Neutral'}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </div>
                            </div>

                            {/* Audio si existe */}
                            {call.recording_url && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Grabación de Audio</h4>
                                <audio controls className="w-full">
                                  <source src={call.recording_url} type="audio/mpeg" />
                                  Tu navegador no soporta el elemento de audio.
                                </audio>
                              </div>
                            )}

                            {/* Resumen */}
                            {call.summary && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-2">Resumen de la Llamada</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{call.summary}</p>
                              </div>
                            )}

                            {/* Transcripción */}
                            {call.transcript && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Transcripción Completa</h4>
                                <div className="max-h-64 overflow-y-auto">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">{call.transcript}</p>
                                </div>
                              </div>
                            )}

                            {/* Custom Data */}
                            {call.metadata?.custom_data && Object.keys(call.metadata.custom_data).length > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-purple-900 mb-3">Datos Personalizados</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(call.metadata.custom_data).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-2 bg-white p-2 rounded">
                                      <span className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                        {key}:
                                      </span>
                                      <span className="text-sm text-gray-700 flex-1">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadata adicional */}
                            {call.metadata?.disconnection_reason && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-amber-900 mb-2">Razón de Desconexión</h4>
                                <p className="text-sm text-gray-700">{call.metadata.disconnection_reason}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
