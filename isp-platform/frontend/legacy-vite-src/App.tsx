import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import { useAuthStore } from './store';
import wsService from './services/websocket';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import MSTPage from './pages/MSTPage';
import FibrePage from './pages/FibrePage';
import MapPage from './pages/MapPage';
import ActivityPage from './pages/ActivityPage';
import NetworkPage from './pages/NetworkPage';
import BillingPage from './pages/BillingPage';
import TicketsPage from './pages/TicketsPage';

// Layout
import Layout from './components/layout/Layout';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, token } = useAuthStore();

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect();
    } else {
      wsService.disconnect();
    }
  }, [isAuthenticated, token]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientsPage />} />
          <Route path="mst" element={<MSTPage />} />
          <Route path="mst/:id" element={<MSTPage />} />
          <Route path="fibre" element={<FibrePage />} />
          <Route path="network" element={<NetworkPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<div className="text-dark-400 p-8">Settings page coming soon...</div>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
