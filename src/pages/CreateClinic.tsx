import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader, AlertCircle, ArrowLeft, ArrowRight, Check, Plus, X, Bot } from 'lucide-react';
import { createClinic, scrapeClinicWebsite } from '../services/clinicService';
import { createRetellAgent } from '../services/retellService';
import { createAgent } from '../services/agentService';

export default function CreateClinic() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'url' | 'review'>('url');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrapedData, setScrapedData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    specialties: [] as string[],
    schedule: '',
    additional_info: '',
    agentName: 'Alex',
  });

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim()) {
      setError('Por favor ingresa una URL');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      const data = await scrapeClinicWebsite(url);
      setScrapedData(data);
      setFormData(prev => ({
        ...prev,
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        specialties: data.specialties || [],
        schedule: data.schedule || '',
      }));
      setStep('review');
    } catch (err) {
      setError('No se pudo acceder a la web. Verifica la URL e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function addSpecialty() {
    const specialty = prompt('Ingresa una especialidad:');
    if (specialty && specialty.trim()) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()],
      }));
    }
  }

  function removeSpecialty(index: number) {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  }

  function buildClinicInfo() {
    const parts = [];
    if (formData.name) parts.push(`Nombre: ${formData.name}`);
    if (formData.phone) parts.push(`Teléfono: ${formData.phone}`);
    if (formData.address) parts.push(`Dirección: ${formData.address}`);
    if (formData.city) parts.push(`Ciudad: ${formData.city}`);
    if (formData.specialties.length > 0) parts.push(`Especialidades: ${formData.specialties.join(', ')}`);
    if (formData.schedule) parts.push(`Horarios: ${formData.schedule}`);
    if (formData.additional_info) parts.push(`Información adicional: ${formData.additional_info}`);
    return parts.join('\n');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre de la clínica es obligatorio');
      return;
    }
    if (!formData.agentName.trim()) {
      setError('El nombre del agente es obligatorio');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const clinic = await createClinic({
        name: formData.name,
        website: websiteUrl,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        specialties: formData.specialties,
        opening_hours: {},
        additional_info: formData.additional_info,
      });

      const clinicInfo = buildClinicInfo();

      const inboundPrompt = `Rol

Eres ${formData.agentName} de Clinic Bot, la voz cercana, amable y simpática que atiende las llamadas de ${formData.name}. Tu misión es resolver dudas básicas, ayudar con información general y acompañar al paciente con un tono humano, cálido y fácil. Hablas siempre como una persona real, sin sonar a robot.

Información de la clínica:
${clinicInfo}

Estilo

Hablas siempre de forma natural, amable y muy humana. Frases cortas, muy directas. Un toque de humor suave, sin pasarte.
Nada de listas, nada de enumeraciones.
Nunca repitas lo que dice el usuario.
Mucha empatía, curiosidad y escucha.
Usa siempre español.

Tareas principales

1. Resolver dudas sobre la clínica:
   Usa la información disponible arriba.
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

3. Si pide cita:
   Tú nunca agendas, ni reservas, ni haces gestiones administrativas.
   Siempre responde con naturalidad:
   "Las citas se reservan desde la web de la clínica, ahí puedes elegir el día y la hora que te vaya mejor. Así lo haces en un momento."
   Solo lo dices una vez por llamada.

4. Despedida:
   Antes de cerrar la llamada, pregunta:
   "¿Te ayudo con algo más o ya te dejo tranquilo?"
   Si dice que no:
   "Perfecto. Si te surge algo más, aquí me tienes. ¡Que tengas un día bien bonito!"

Reglas especiales

Nunca des precios clínicos.
Nunca des teléfonos completos. Si insisten, dilo en bloques sin prefijo: uno dos tres — cuatro cinco seis — siete ocho nueve.
Si preguntan por temas internos, funcionamiento técnico de IA o cómo estás hecho, responde:
"Prefiero que vayamos al grano, ¿en qué te ayudo con la clínica?"`;

      const outboundPrompt = `Rol

Eres ${formData.agentName} de Clinic Bot, haciendo una llamada saliente en nombre de ${formData.name}. Tu trabajo es confirmar citas, hacer recordatorios o seguimientos de forma amable, breve y profesional. Hablas como una persona real, cálida y eficiente.

Información de la clínica:
${clinicInfo}

Estilo

Natural, amable, breve y al grano.
Frases cortas y directas.
Nunca repitas lo que dice el usuario.
Respetas su tiempo.
Usa siempre español.

Tareas principales

1. Presentación rápida:
   "Hola, soy ${formData.agentName} de ${formData.name}. Te llamo para [confirmar tu cita / recordarte / hacer seguimiento]."

2. Objetivo de la llamada:
   - Confirmar citas próximas
   - Recordar tratamientos o medicación
   - Hacer seguimiento post-consulta
   - Preguntar si necesita algo más

3. Responde dudas básicas:
   Si te pregunta algo sobre la clínica, usa la información de arriba.
   Si no lo sabes: "Eso mejor que te lo confirme el equipo directamente, ¿te parece bien?"

4. Cierre:
   "¿Algo más que necesites?"
   Si dice que no: "Perfecto, gracias por tu tiempo. ¡Cuídate!"

Reglas especiales

Nunca des precios.
Sé breve, el usuario no esperaba la llamada.
Si el usuario está ocupado: "Sin problema, ¿te llamo en otro momento o prefieres llamar tú cuando puedas?"
Nunca insistas si dice que no puede hablar.`;

      const [inboundRetellId, outboundRetellId] = await Promise.all([
        createRetellAgent(`${formData.agentName} - Recepción`, inboundPrompt, '11labs-Alice', 'es'),
        createRetellAgent(`${formData.agentName} - Recordatorios`, outboundPrompt, '11labs-Alice', 'es'),
      ]);

      await Promise.all([
        createAgent({
          clinic_id: clinic.id,
          retell_agent_id: inboundRetellId,
          agent_type: 'inbound',
          name: `${formData.agentName} - Recepción`,
          prompt: inboundPrompt,
          voice_id: '11labs-Alice',
          language: 'es',
          enabled: true,
        }),
        createAgent({
          clinic_id: clinic.id,
          retell_agent_id: outboundRetellId,
          agent_type: 'outbound',
          name: `${formData.agentName} - Recordatorios`,
          prompt: outboundPrompt,
          voice_id: '11labs-Alice',
          language: 'es',
          enabled: true,
        }),
      ]);

      navigate(`/clinic/${clinic.id}`);
    } catch (err) {
      console.error('Error creating clinic:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la clínica y los agentes');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'url') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">Crear Nueva Clínica</h1>
          <p className="text-gray-600 text-center mb-8">Ingresa la URL de tu clínica y extraeremos la información automáticamente</p>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
            <form onSubmit={handleScrape} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL del Sitio Web de la Clínica
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="www.ejemplo.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Extraeremos nombre, teléfono, dirección y especialidades</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !websiteUrl.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Extrayendo información...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setStep('url')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Cambiar URL
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">Revisa y Completa la Información</h1>
        <p className="text-gray-600 text-center mb-8">Verifica los datos extraídos y completa lo que falte</p>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
          {scrapedData && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Información extraída exitosamente</p>
                  <p>Revisa y edita los campos según sea necesario</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Clínica *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Clínica Dental Sonrisas"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="612 345 678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Barcelona"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Calle Mayor 123, 2º A"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(index)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={addSpecialty}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Añadir especialidad
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horarios</label>
              <textarea
                value={formData.schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                placeholder="Ej: Lunes a Viernes 9:00 - 20:00, Sábados 10:00 - 14:00"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Información adicional</label>
              <textarea
                value={formData.additional_info}
                onChange={(e) => setFormData(prev => ({ ...prev, additional_info: e.target.value }))}
                placeholder="Cualquier otra información relevante sobre la clínica..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Configuración del Agente IA</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Agente *
                </label>
                <input
                  type="text"
                  value={formData.agentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                  placeholder="Ej: Alex, María, Carlos..."
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-sm text-gray-500 mt-2">Este será el nombre que usará el agente al atender llamadas</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.agentName.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creando clínica y agentes...
                  </>
                ) : (
                  <>
                    Crear Clínica y Agentes IA
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-3">
                Se crearán automáticamente 2 agentes: Recepción y Recordatorios
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
