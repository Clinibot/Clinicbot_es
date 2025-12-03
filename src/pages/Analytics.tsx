import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Clock, DollarSign, TrendingUp, RefreshCw, FileText, User, Calendar, Play } from 'lucide-react';
import { getCallHistory, getCallAnalytics, syncCallsForClinic, CallRecord, CallAnalytics } from '../services/callHistoryService';
import { getClinic } from '../services/clinicService';

type DateFilter = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function Analytics() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<any>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [clinicId, dateFilter, customStartDate, customEndDate]);

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
      const [clinicData, allCallsData] = await Promise.all([
        getClinic(clinicId),
        getCallHistory(clinicId, { limit: 1000 }),
      ]);

      setClinic(clinicData);

      // Aplicar markup del 20% al user_cost
      const callsWithMarkup = allCallsData.map(call => ({
        ...call,
        user_cost: call.user_cost * 1.2, // Añadir 20%
      }));

      // Filtrar por rango de fechas
      const { start, end } = getDateRange();
      let filteredCalls = callsWithMarkup;

      if (start && end) {
        filteredCalls = callsWithMarkup.filter(call => {
          const callDate = new Date(call.started_at);
          return callDate >= start && callDate <= end;
        });
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

  const filteredCalls = calls.filter(call => {
    if (filter === 'all') return true;
    if (filter === 'completed') return call.call_status === 'completed';
    if (filter === 'missed') return call.call_status === 'missed' || call.call_status === 'no-answer';
    return true;
  });

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
              📅 Hoy
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'week'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Última Semana
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📈 Último Mes
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌐 Todas
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'custom'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🗓️ Personalizado
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Historial de Llamadas</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    filter === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Completadas
                </button>
                <button
                  onClick={() => setFilter('missed')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    filter === 'missed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Perdidas
                </button>
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
                    Estado
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
                            <div className="text-sm font-medium text-gray-900">
                              {call.caller_name || 'Desconocido'}
                            </div>
                            <div className="text-sm text-gray-500">{call.caller_phone}</div>
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
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            call.call_status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {call.call_status === 'completed' ? 'Completada' : 'No completada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(call.user_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedCall && (
          <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
        )}
      </div>
    </div>
  );
}

interface CallDetailModalProps {
  call: CallRecord;
  onClose: () => void;
}

function CallDetailModal({ call, onClose }: CallDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'metadata'>('summary');

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Detalles de la Llamada</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">Teléfono</p>
              <p className="text-sm font-semibold text-gray-900">{call.caller_phone || 'Desconocido'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Nombre</p>
              <p className="text-sm font-semibold text-gray-900">{call.caller_name || 'Desconocido'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Duración</p>
              <p className="text-sm font-semibold text-gray-900">{formatDuration(call.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Estado</p>
              <p className="text-sm font-semibold text-gray-900">
                {call.call_status === 'completed' ? '✓ Completada' : '✗ No completada'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Coste (+20%)</p>
              <p className="text-sm font-semibold text-green-700">{formatCurrency(call.user_cost)}</p>
            </div>
          </div>

          {call.recording_url && (
            <div className="mb-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-semibold text-gray-700">Grabación de Audio</p>
              </div>
              <audio controls className="w-full">
                <source src={call.recording_url} type="audio/mpeg" />
                Tu navegador no soporta el elemento de audio.
              </audio>
            </div>
          )}
        </div>

        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'summary'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Resumen
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'transcript'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💬 Transcripción
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'metadata'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Datos Adicionales
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {call.summary ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Resumen de la Llamada</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{call.summary}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No hay resumen disponible para esta llamada</p>
              )}

              {call.intent && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-900 mb-2">🎯 Intención de la Llamada</h4>
                  <p className="text-sm text-gray-700">{call.intent}</p>
                </div>
              )}

              {call.metadata?.sentiment && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">😊 Sentimiento</h4>
                  <p className="text-sm text-gray-700">{call.metadata.sentiment}</p>
                </div>
              )}

              {call.metadata?.disconnection_reason && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">🔌 Razón de Desconexión</h4>
                  <p className="text-sm text-gray-700">{call.metadata.disconnection_reason}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div>
              {call.transcript ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">💬 Transcripción Completa</h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
                      {call.transcript}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay transcripción disponible para esta llamada
                </p>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">ID de Llamada Externa</p>
                  <p className="text-sm text-gray-900 font-mono break-all">{call.external_call_id}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Tipo de Llamada</p>
                  <p className="text-sm text-gray-900 font-semibold">{call.call_type || 'No especificado'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Inicio</p>
                  <p className="text-sm text-gray-900">{new Date(call.started_at).toLocaleString('es-ES')}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Fin</p>
                  <p className="text-sm text-gray-900">
                    {call.ended_at ? new Date(call.ended_at).toLocaleString('es-ES') : 'En curso'}
                  </p>
                </div>
              </div>

              {call.metadata && Object.keys(call.metadata).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">🔧 Metadatos Personalizados</h4>
                  <div className="space-y-2">
                    {Object.entries(call.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-xs font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded min-w-[120px]">
                          {key}:
                        </span>
                        <span className="text-sm text-gray-700 flex-1">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-3">💰 Información de Costes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coste Retell AI (original):</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(call.external_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Markup (+20%):</span>
                    <span className="font-semibold text-green-700">
                      +{formatCurrency(call.user_cost - call.external_cost)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="text-gray-900 font-semibold">Coste Final (usuario):</span>
                    <span className="font-bold text-green-700 text-lg">{formatCurrency(call.user_cost)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
