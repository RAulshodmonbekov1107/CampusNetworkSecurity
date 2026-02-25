import React, { Suspense, lazy, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineDetector from './components/common/OfflineDetector';
import { useAlertWebSocket } from './hooks/useAlertWebSocket';
import { RealtimeAlert } from './types';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NetworkTraffic = lazy(() => import('./pages/NetworkTraffic'));
const SecurityAlerts = lazy(() => import('./pages/SecurityAlerts'));
const ThreatIntelligence = lazy(() => import('./pages/ThreatIntelligence'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

const LoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0a0e27',
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CircularProgress sx={{ color: '#00bcd4' }} />
    </motion.div>
  </Box>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isAdmin = user?.role === 'admin' || user?.is_superuser === true;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Real-time alert bridge — lives inside AuthProvider so it has auth context
const RealtimeAlertBridge: React.FC = () => {
  const handleAlert = useCallback((alert: RealtimeAlert) => {
    const msg = `${alert.title} — ${alert.source_ip}`;
    if (alert.severity === 'critical') {
      toast.error(msg, { description: alert.category, duration: 8000 });
    } else {
      toast.warning(msg, { description: alert.category, duration: 6000 });
    }
  }, []);
  useAlertWebSocket(handleAlert);
  return null;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <OfflineDetector />
            <RealtimeAlertBridge />
            <Toaster
              position="top-right"
              richColors
              toastOptions={{
                style: {
                  background: 'rgba(26, 31, 58, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                },
              }}
            />
            {/*
              Simple flat Routes — NO key/AnimatePresence here.
              Page transitions are handled inside MainLayout around <Outlet />.
            */}
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected layout — Outlet renders the active page */}
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
                  <Route
                    path="settings"
                    element={
                      <AdminRoute>
                        <Settings />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <AdminRoute>
                        <UserManagement />
                      </AdminRoute>
                    }
                  />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
