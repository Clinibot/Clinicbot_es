import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateClinic from './pages/CreateClinic';
import EditClinic from './pages/EditClinic';
import ClinicDetail from './pages/ClinicDetail';
import CreateAgent from './pages/CreateAgent';
import AgentDetail from './pages/AgentDetail';
import Analytics from './pages/Analytics';
import ManageCalcom from './pages/ManageCalcom';
import ManagePhones from './pages/ManagePhones';
import MakeCalls from './pages/MakeCalls';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="inline-block animate-spin">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="inline-block animate-spin">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-clinic"
            element={
              <ProtectedRoute>
                <CreateClinic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId"
            element={
              <ProtectedRoute>
                <ClinicDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/edit"
            element={
              <ProtectedRoute>
                <EditClinic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/create-agent"
            element={
              <ProtectedRoute>
                <CreateAgent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/agent/:agentId"
            element={
              <ProtectedRoute>
                <AgentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/calcom"
            element={
              <ProtectedRoute>
                <ManageCalcom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/phones"
            element={
              <ProtectedRoute>
                <ManagePhones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/:clinicId/calls"
            element={
              <ProtectedRoute>
                <MakeCalls />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
