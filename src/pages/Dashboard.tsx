import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Zap } from 'lucide-react';
import { signOut } from '../services/authService';
import { getUserClinics } from '../services/clinicService';
import { Clinic } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClinics();
  }, []);

  async function loadClinics() {
    try {
      const data = await getUserClinics();
      setClinics(data || []);
    } catch (err) {
      console.error('Error loading clinics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/auth');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">ClinicBot</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900">
            <LogOut className="w-5 h-5" />
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Mis Clínicas</h1>
          <p className="text-gray-600">Gestiona todas tus clínicas y crea nuevas recepcionistas IA</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : clinics.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-12 text-center">
            <Zap className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No tienes clínicas aún</h2>
            <p className="text-gray-600 mb-6">Comienza creando tu primera clínica</p>
            <button
              onClick={() => navigate('/create-clinic')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Crear Primera Clínica
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                onClick={() => navigate(`/clinic/${clinic.id}`)}
                className="bg-white rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl cursor-pointer overflow-hidden"
              >
                <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{clinic.name}</h3>
                  {clinic.city && <p className="text-sm text-gray-600 mb-4">{clinic.city}</p>}
                  <div className="text-blue-600 font-medium text-sm">Configurar Sofía</div>
                </div>
              </div>
            ))}
            <button
              onClick={() => navigate('/create-clinic')}
              className="bg-white rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl p-6 flex flex-col items-center justify-center min-h-64"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nueva Clínica</h3>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
