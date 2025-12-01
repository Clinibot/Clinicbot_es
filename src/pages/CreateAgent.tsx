import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Volume2, Loader } from 'lucide-react';
import { createAgent, VOICES, LANGUAGES } from '../services/agentService';
import { createRetellAgent, testRetellConnection } from '../services/retellService';
import { getClinic } from '../services/clinicService';

export default function CreateAgent() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [agentType, setAgentType] = useState<'inbound' | 'outbound'>('inbound');
  const [agentName, setAgentName] = useState('');
  const [agentPersonName, setAgentPersonName] = useState('Alex');
  const [prompt, setPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('11labs-Alice');
  const [language, setLanguage] = useState('multi');

  useEffect(() => {
    loadClinic();
  }, [clinicId]);

  useEffect(() => {
    if (clinic) {
      updatePromptForType(agentType);
    }
  }, [agentType, clinic, agentPersonName]);

  async function loadClinic() {
    if (!clinicId) return;
    try {
      const data = await getClinic(clinicId);
      setClinic(data);
      setAgentName(`${data.name} - Recepción`);
    } catch (err) {
      setError('Error al cargar la clínica');
    } finally {
      setLoading(false);
    }
  }

  function buildClinicInfo() {
    if (!clinic) return '';
    const parts = [];
    if (clinic.name) parts.push(`Nombre: ${clinic.name}`);
    if (clinic.website) parts.push(`Web: ${clinic.website}`);
    if (clinic.phone) parts.push(`Teléfono: ${clinic.phone}`);
    if (clinic.address) parts.push(`Dirección: ${clinic.address}`);
    if (clinic.city) parts.push(`Ciudad: ${clinic.city}`);
    if (clinic.specialties?.length > 0) parts.push(`Especialidades: ${clinic.specialties.join(', ')}`);
    if (clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0) {
      parts.push(`Horarios: ${JSON.stringify(clinic.opening_hours)}`);
    }
    if (clinic.additional_info) parts.push(`Información adicional: ${clinic.additional_info}`);

    if (clinic.google_calendars && clinic.google_calendars.length > 0) {
      parts.push('\nCalendarios disponibles para citas:');
      clinic.google_calendars.forEach((cal: any) => {
        if (cal.enabled) {
          parts.push(`- ${cal.name} (${cal.serviceType}): ${cal.email}`);
        }
      });
    }

    return parts.join('\n');
  }

  function updatePromptForType(type: 'inbound' | 'outbound') {
    if (!clinic) return;

    const agentNameBase = agentName.replace(' - Recepción', '').replace(' - Recordatorios', '') || clinic.name;
    const clinicInfo = buildClinicInfo();

    if (type === 'inbound') {
      setAgentName(`${agentNameBase} - Recepción`);
      setPrompt(`Rol

Eres ${agentPersonName} de ${clinic.name}, la voz cercana, amable y simpática que atiende las llamadas. Tu misión es resolver dudas básicas, ayudar con información general y acompañar al paciente con un tono humano, cálido y fácil. Hablas siempre como una persona real, sin sonar a robot.

Información de la clínica:
${clinicInfo}

Estilo

Hablas siempre de forma natural, amable y muy humana. Frases cortas, muy directas. Un toque de humor suave, sin pasarte.
Nada de listas, nada de enumeraciones.
Nunca repitas lo que dice el usuario.
Mucha empatía, curiosidad y escucha.
Adapta el idioma al paciente según sea necesario.

Tareas principales

1. Resolver dudas sobre la clínica:
   Usa TODA la información disponible arriba (nombre, dirección, teléfono, especialidades, horarios, web, información adicional).
   Explícalo siempre de forma sencilla, humana y cercana.
   Si falta un dato o no está claro:
   "Pues eso no lo tengo por aquí, pero si quieres se lo digo al equipo para que te respondan rápido."

   Si el usuario está enfadado o preocupado, usas empatía suave y humor ligero que no minimice su problema.

2. Preguntar por contexto:
   Cuando respondas una duda, sigue con una pregunta suave como:
   "¿Y esto lo necesitas para ti, para alguien de tu familia, o solo estás mirando opciones?"
   Interésate por qué necesita el paciente, qué busca, si ya ha venido antes, si tiene seguro, etc.
   No hagas más de una pregunta por turno.

   Luego pide el teléfono de contacto para anotarlo sin repetirlo.

3. Gestión de citas (si hay calendarios configurados):
   Si hay calendarios disponibles arriba, puedes:
   - Consultar disponibilidad en los calendarios de Google
   - Reservar citas nuevas
   - Anular citas existentes
   - Reagendar citas

   Pregunta por el servicio que necesita para usar el calendario correcto.
   Pregunta por fecha y hora preferida.
   Confirma nombre completo, teléfono y email del paciente.

   Si NO hay calendarios configurados:
   "Las citas se reservan desde la web de la clínica, ahí puedes elegir el día y la hora que te vaya mejor."

4. Despedida:
   Antes de cerrar la llamada, pregunta:
   "¿Te ayudo con algo más o ya te dejo tranquilo?"
   Si dice que no:
   "Perfecto. Si te surge algo más, aquí me tienes. ¡Que tengas un día bien bonito!"

Reglas especiales

Nunca des precios clínicos.
Nunca des teléfonos completos. Si insisten, dilo en bloques sin prefijo: uno dos tres — cuatro cinco seis — siete ocho nueve.
Si preguntan por temas internos, funcionamiento técnico de IA o cómo estás hecho, responde:
"Prefiero que vayamos al grano, ¿en qué te ayudo con la clínica?"`);
    } else {
      setAgentName(`${agentNameBase} - Recordatorios`);
      setPrompt(`Rol

Eres ${agentPersonName} de ${clinic.name}, haciendo una llamada saliente. Tu trabajo es confirmar citas, hacer recordatorios o seguimientos de forma amable, breve y profesional. Hablas como una persona real, cálida y eficiente.

Información de la clínica:
${clinicInfo}

Estilo

Natural, amable, breve y al grano.
Frases cortas y directas.
Nunca repitas lo que dice el usuario.
Respetas su tiempo.
Adapta el idioma al paciente según sea necesario.

Tareas principales

1. Presentación rápida:
   "Hola, soy ${agentPersonName} de ${clinic.name}. Te llamo para [confirmar tu cita / recordarte / hacer seguimiento]."

2. Objetivo de la llamada:
   - Confirmar citas próximas
   - Recordar tratamientos o medicación
   - Hacer seguimiento post-consulta
   - Preguntar si necesita algo más

3. Responde dudas básicas:
   Si te pregunta algo sobre la clínica, usa TODA la información de arriba (nombre, dirección, teléfono, especialidades, horarios, web, información adicional).
   Si no lo sabes: "Eso mejor que te lo confirme el equipo directamente, ¿te parece bien?"

4. Cierre:
   "¿Algo más que necesites?"
   Si dice que no: "Perfecto, gracias por tu tiempo. ¡Cuídate!"

Reglas especiales

Nunca des precios.
Sé breve, el usuario no esperaba la llamada.
Si el usuario está ocupado: "Sin problema, ¿te llamo en otro momento o prefieres llamar tú cuando puedas?"
Nunca insistas si dice que no puede hablar.`);
    }
  }

  async function handleTestConnection() {
    setError('');
    try {
      await testRetellConnection();
      alert('Revisa la consola del navegador para ver los resultados');
    } catch (err) {
      console.error('Error testing connection:', err);
      setError('Error al probar conexión');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId || !agentName) return;
    setSubmitting(true);
    setError('');
    try {
      const retellAgentId = await createRetellAgent(agentName, prompt, voiceId, language);
      const newAgent = await createAgent({
        clinic_id: clinicId,
        retell_agent_id: retellAgentId,
        agent_type: agentType,
        name: agentName,
        prompt,
        voice_id: voiceId,
        language,
        enabled: true,
      });
      navigate(`/clinic/${clinicId}/agent/${newAgent.id}`);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el agente');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(`/clinic/${clinicId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Agente</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Tipo de Agente</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAgentType('inbound')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  agentType === 'inbound'
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Phone className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <p className="font-semibold text-lg">Llamadas Entrantes</p>
                <p className="text-sm text-gray-600 mt-2">Atiende llamadas de pacientes</p>
              </button>
              <button
                type="button"
                onClick={() => setAgentType('outbound')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  agentType === 'outbound'
                    ? 'border-green-600 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Phone className="w-8 h-8 mx-auto mb-3 text-green-600 rotate-180" />
                <p className="font-semibold text-lg">Llamadas Salientes</p>
                <p className="text-sm text-gray-600 mt-2">Hace recordatorios de citas</p>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Configuración Básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Agente</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Ej: Clínica Demo - Recepción"
                />
                <p className="text-xs text-gray-500 mt-1">Nombre interno para identificar el agente</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Persona</label>
                <input
                  type="text"
                  value={agentPersonName}
                  onChange={(e) => setAgentPersonName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Ej: Alex, María, Carlos..."
                />
                <p className="text-xs text-gray-500 mt-1">El nombre con el que se presentará al atender llamadas</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voz
                    <span className="text-xs text-gray-500 ml-2">(Escucha previews en el Dashboard de Retell)</span>
                  </label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-2">Prompt del Sistema</h2>
            <p className="text-sm text-gray-600 mb-4">
              Instrucciones que guían el comportamiento del agente. El prompt se ha generado automáticamente basándose en la información de tu clínica.
            </p>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={30}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                style={{
                  minHeight: '600px',
                  background: '#fafafa',
                  lineHeight: '1.6'
                }}
              />
              <div className="absolute top-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">
                {prompt.split('\n').length} líneas
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Probar Conexión
            </button>
            <button
              type="submit"
              disabled={submitting || !agentName}
              className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Creando agente...
                </span>
              ) : (
                'Crear Agente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
