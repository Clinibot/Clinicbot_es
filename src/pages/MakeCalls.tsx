import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Upload, Users, CheckCircle, AlertCircle, Play, PhoneOff } from 'lucide-react';
import { getClinic } from '../services/clinicService';
import { getClinicAgents } from '../services/agentService';
import { createBatchCalls } from '../services/batchCallsService';
import { getAgentPhoneNumber } from '../services/phoneNumberService';
import { createCampaign, createCampaignExecution } from '../services/campaignService';
import { Agent, Clinic, PhoneNumber } from '../types';

interface CallRecipient {
  phone: string;
  name?: string;
}

export default function MakeCalls() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Paso 1: Selección de agente
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedAgentPhone, setSelectedAgentPhone] = useState<PhoneNumber | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  // Paso 2: Lista de contactos
  const [contacts, setContacts] = useState<CallRecipient[]>([]);
  const [uploadError, setUploadError] = useState<string>('');

  // Paso 3: Ejecución
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [clinicId]);

  useEffect(() => {
    if (selectedAgentId) {
      loadAgentPhone(selectedAgentId);
    } else {
      setSelectedAgentPhone(null);
    }
  }, [selectedAgentId]);

  async function loadData() {
    if (!clinicId) return;
    try {
      const [clinicData, agentsData] = await Promise.all([
        getClinic(clinicId),
        getClinicAgents(clinicId),
      ]);
      setClinic(clinicData);

      // Solo mostrar agentes salientes (outbound)
      const outboundAgents = agentsData.filter(a => a.agent_type === 'outbound');
      setAgents(outboundAgents);

      // Preseleccionar si solo hay un agente
      if (outboundAgents.length === 1) {
        setSelectedAgentId(outboundAgents[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgentPhone(agentId: string) {
    setLoadingPhone(true);
    try {
      const phoneNumber = await getAgentPhoneNumber(agentId, 'outbound');
      setSelectedAgentPhone(phoneNumber);
    } catch (error) {
      console.error('Error loading agent phone:', error);
      setSelectedAgentPhone(null);
    } finally {
      setLoadingPhone(false);
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        const parsedContacts: CallRecipient[] = [];

        // Detectar formato: CSV con header o sin header
        lines.forEach((line, index) => {
          // Skip header si existe
          if (index === 0 && (line.toLowerCase().includes('teléfono') || line.toLowerCase().includes('nombre'))) {
            return;
          }

          const parts = line.split(/[,;|\t]/).map(p => p.trim());

          if (parts.length >= 1) {
            const phone = parts[0].replace(/\s/g, ''); // Quitar espacios

            // Validar que sea un teléfono válido
            if (phone && /^[\d+\-\(\)\s]+$/.test(phone)) {
              parsedContacts.push({
                phone,
                name: parts[1] || undefined,
              });
            }
          }
        });

        if (parsedContacts.length === 0) {
          setUploadError('No se encontraron números de teléfono válidos en el archivo');
          return;
        }

        setContacts(parsedContacts);
      } catch (error) {
        setUploadError('Error al leer el archivo. Asegúrate de que sea un archivo CSV válido.');
      }
    };

    reader.readAsText(file);
  }

  function handleManualAdd() {
    const phone = prompt('Introduce el número de teléfono (con código de país, ej: +34612345678):');
    if (!phone) return;

    const name = prompt('Introduce el nombre (opcional):') || undefined;

    setContacts([...contacts, { phone: phone.trim(), name }]);
  }

  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }

  async function handleExecute() {
    if (!selectedAgentId || contacts.length === 0 || !clinicId || !selectedAgentPhone) return;

    // Preguntar si quiere guardar como campaña
    const saveCampaign = confirm(
      `¿Quieres guardar esto como una campaña reutilizable?\n\n` +
      `Si guardas como campaña, podrás:\n` +
      `• Ver el historial de ejecuciones\n` +
      `• Relanzarla con nuevos contactos en el futuro\n` +
      `• Programarla para otra fecha\n\n` +
      `¿Guardar como campaña?`
    );

    let campaignName = '';
    let campaignDescription = '';

    if (saveCampaign) {
      campaignName = prompt('Nombre de la campaña (ej: "Recordatorio limpieza bucal"):') || '';
      if (!campaignName.trim()) {
        alert('❌ El nombre de la campaña es obligatorio');
        return;
      }
      campaignDescription = prompt('Descripción (opcional):') || '';
    }

    const confirmed = confirm(
      `¿Iniciar ${contacts.length} llamada${contacts.length > 1 ? 's' : ''}?\n\n` +
      `Agente: ${agents.find(a => a.id === selectedAgentId)?.name}\n` +
      `Número saliente: ${selectedAgentPhone.phone_number}\n` +
      `Contactos: ${contacts.length}\n` +
      (saveCampaign ? `Campaña: "${campaignName}"\n` : '') +
      `\nLas llamadas comenzarán inmediatamente.`
    );

    if (!confirmed) return;

    setExecuting(true);
    setExecutionResult(null);

    try {
      let campaignId: string | undefined;

      // Si quiere guardar como campaña, crearla primero
      if (saveCampaign && campaignName) {
        const campaign = await createCampaign(
          clinicId,
          campaignName,
          selectedAgentId,
          campaignDescription || undefined
        );
        campaignId = campaign.id;

        // Crear la ejecución de la campaña
        await createCampaignExecution(campaignId, contacts);
      }

      // Ejecutar las llamadas
      await createBatchCalls(clinicId, selectedAgentId, contacts);

      setExecutionResult({
        success: true,
        message: saveCampaign
          ? `✅ Campaña "${campaignName}" guardada y ${contacts.length} llamada${contacts.length > 1 ? 's iniciadas' : ' iniciada'}`
          : `✅ Se han iniciado ${contacts.length} llamada${contacts.length > 1 ? 's' : ''} correctamente`,
      });

      // Limpiar después de éxito
      setTimeout(() => {
        setContacts([]);
        setExecutionResult(null);
        if (saveCampaign) {
          // Navegar a campañas para ver la nueva campaña
          navigate(`/clinic/${clinicId}/campaigns`);
        }
      }, 3000);

    } catch (error) {
      setExecutionResult({
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      });
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate(`/clinic/${clinicId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>

          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No hay agentes salientes</h2>
            <p className="text-gray-600 mb-6">
              Necesitas crear un agente de tipo "Salientes" para hacer llamadas automáticas.
            </p>
            <button
              onClick={() => navigate(`/clinic/${clinicId}/create-agent`)}
              className="px-6 py-3 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
            >
              Crear Agente Saliente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/clinic/${clinicId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hacer Llamadas</h1>
              <p className="text-sm text-gray-500">{clinic?.name}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/clinic/${clinicId}/campaigns`)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
          >
            <Phone className="w-4 h-4" />
            Ver Campañas
          </button>
        </div>

        {/* Instrucciones simples */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Muy fácil en 3 pasos:</h3>
              <ol className="space-y-1 text-sm text-gray-700">
                <li>1️⃣ Elige qué agente hará las llamadas</li>
                <li>2️⃣ Sube tu lista de clientes o añádelos uno por uno</li>
                <li>3️⃣ Dale a "Iniciar Llamadas" y listo!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Paso 1: Seleccionar Agente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Elige el Agente</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Este agente será quien haga las llamadas a tus clientes
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAgentId === agent.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Phone className={`w-5 h-5 ${selectedAgentId === agent.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-semibold text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">Agente saliente</div>
                    </div>
                    {selectedAgentId === agent.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mostrar teléfono asignado o solicitar */}
          {selectedAgentId && (
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              {loadingPhone ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Verificando teléfono...</p>
                </div>
              ) : selectedAgentPhone ? (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-900 mb-1">Teléfono asignado</h4>
                    <p className="text-sm text-green-700">
                      Las llamadas se harán desde: <strong className="font-mono">{selectedAgentPhone.phone_number}</strong> ({selectedAgentPhone.country})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <PhoneOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-1">Sin teléfono asignado</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Este agente necesita un número virtual para hacer llamadas. Ve a Gestionar Teléfonos para asignar un número o solicitar uno nuevo.
                    </p>
                    <button
                      onClick={() => navigate(`/clinic/${clinicId}/phones`)}
                      className="text-sm px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      Gestionar Teléfonos
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paso 2: Subir Contactos */}
        {selectedAgentId && selectedAgentPhone && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Añade tus Clientes</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Puedes subir un archivo CSV o añadir contactos manualmente
              </p>

              {/* Botones de carga */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                    <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold text-gray-900">Subir archivo CSV</div>
                    <div className="text-xs text-gray-500">Formato: teléfono, nombre</div>
                  </div>
                </label>

                <button
                  onClick={handleManualAdd}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold text-gray-900">Añadir uno por uno</div>
                  <div className="text-xs text-gray-500">Introduce manualmente</div>
                </button>
              </div>

              {/* Error de carga */}
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{uploadError}</p>
                </div>
              )}

              {/* Ejemplo de formato */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Ejemplo de archivo CSV:</h4>
                <pre className="text-xs text-blue-800 font-mono bg-white p-2 rounded">
{`+34612345678,María García
+34698765432,Juan López
+34611223344,Ana Martínez`}
                </pre>
                <p className="text-xs text-blue-700 mt-2">
                  Primera columna: teléfono con código de país (+34 para España)
                  <br />
                  Segunda columna: nombre (opcional)
                </p>
              </div>
            </div>

            {/* Lista de contactos */}
            {contacts.length > 0 && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Contactos añadidos: {contacts.length}
                  </h3>
                  <button
                    onClick={() => setContacts([])}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Limpiar todo
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{contact.phone}</div>
                          {contact.name && (
                            <div className="text-xs text-gray-500">{contact.name}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Ejecutar */}
        {selectedAgentId && selectedAgentPhone && contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Iniciar Llamadas</h2>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-4">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Todo listo!</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p>✓ Agente: <strong>{agents.find(a => a.id === selectedAgentId)?.name}</strong></p>
                      <p>✓ Desde: <strong className="font-mono">{selectedAgentPhone.phone_number}</strong></p>
                      <p>✓ Contactos: <strong>{contacts.length} persona{contacts.length > 1 ? 's' : ''}</strong></p>
                    </div>
                  </div>
                </div>
              </div>

              {executionResult && (
                <div className={`mb-4 p-4 rounded-lg ${
                  executionResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${executionResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {executionResult.message}
                  </p>
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={executing}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {executing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Iniciando llamadas...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Iniciar {contacts.length} Llamada{contacts.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
