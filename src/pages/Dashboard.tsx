import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Zap, Shield } from 'lucide-react';
import { signOut } from '../services/authService';
import { getUserClinics } from '../services/clinicService';
import { supabase } from '../lib/supabase';
import { Clinic } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadClinics();
    checkAdmin();
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

  async function checkAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'sonia@sonia.com') {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Error checking admin:', err);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/auth');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ClinicBot</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-900 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow hover:shadow-md"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Mis Clínicas</h1>
          <p className="text-gray-500">Gestiona todas tus clínicas y crea nuevas recepcionistas IA</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : clinics.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tienes clínicas aún</h2>
            <p className="text-gray-500 mb-6">Comienza creando tu primera clínica</p>
            <button
              onClick={() => navigate('/create-clinic')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Clínica
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                onClick={() => navigate(`/clinic/${clinic.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer overflow-hidden transition-all group"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{clinic.name}</h3>
                  {clinic.city && <p className="text-sm text-gray-500 mb-4">{clinic.city}</p>}
                  <div className="text-blue-600 text-sm font-medium">Ver detalles →</div>
                </div>
              </div>
            ))}
            <button
              onClick={() => navigate('/create-clinic')}
              className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 p-6 flex flex-col items-center justify-center min-h-[160px] transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Nueva Clínica</h3>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
