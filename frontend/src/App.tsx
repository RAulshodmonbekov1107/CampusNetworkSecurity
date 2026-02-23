import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineDetector from './components/common/OfflineDetector';
import LoadingSkeleton from './components/common/LoadingSkeleton';

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

  if (loading) {
    return <LoadingFallback />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  duration: 0.4,
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={pageTransition}
              >
                <Login />
              </motion.div>
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={pageTransition}
              >
                <Register />
              </motion.div>
            </Suspense>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Suspense fallback={<LoadingFallback />}>
                <MainLayout />
              </Suspense>
            </PrivateRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<LoadingSkeleton variant="stats" />}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Dashboard />
                </motion.div>
              </Suspense>
            }
          />
          <Route
            path="network"
            element={
              <Suspense fallback={<LoadingSkeleton variant="card" count={2} />}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <NetworkTraffic />
                </motion.div>
              </Suspense>
            }
          />
          <Route
            path="alerts"
            element={
              <Suspense fallback={<LoadingSkeleton variant="list" count={5} />}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <SecurityAlerts />
                </motion.div>
              </Suspense>
            }
          />
          <Route
            path="threats"
            element={
              <Suspense fallback={<LoadingSkeleton variant="card" count={2} />}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <ThreatIntelligence />
                </motion.div>
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<LoadingSkeleton variant="card" count={1} />}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Settings />
                </motion.div>
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<LoadingSkeleton variant="list" count={8} />}>
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <UserManagement />
                </motion.div>
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <OfflineDetector />
            <AnimatedRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;

