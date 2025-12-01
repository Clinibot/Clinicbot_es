import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader, AlertCircle, ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { createClinic, scrapeClinicWebsite } from '../services/clinicService';

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

      navigate(`/clinic/${clinic.id}`);
    } catch (err) {
      console.error('Error creating clinic:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la clínica');
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creando clínica...
                  </>
                ) : (
                  <>
                    Crear Clínica
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-3">
                Podrás crear agentes IA después de crear la clínica
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
