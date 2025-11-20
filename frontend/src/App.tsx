import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NetworkTraffic from './pages/NetworkTraffic';
import SecurityAlerts from './pages/SecurityAlerts';
import ThreatIntelligence from './pages/ThreatIntelligence';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="network" element={<NetworkTraffic />} />
          <Route path="alerts" element={<SecurityAlerts />} />
          <Route path="threats" element={<ThreatIntelligence />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;

