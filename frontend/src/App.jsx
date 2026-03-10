import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import History from './pages/History';
import Login from './pages/Login';
import ProjectSelector from './pages/ProjectSelector';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions'; // NUEVA RUTA
import { AuthProvider, useAuth } from './AuthContext';

// ... (Resto de ProtectedRoute igual)
const ProtectedRoute = ({ children, requireRole, skipProjectCheck = false }) => {
  const { token, user, activeProject, loading } = useAuth();
  if (loading) return <div className="p-8">Cargando...</div>;
  if (!token || !user) return <Navigate to="/login" replace />;

  if (requireRole && user.role !== requireRole && user.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  if (!requireRole && !activeProject && !skipProjectCheck) {
    return <Navigate to="/projects" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/projects" element={
            <ProtectedRoute requireRole={null} skipProjectCheck={true}><ProjectSelector /></ProtectedRoute>
          } />

          <Route path="/" element={<ProtectedRoute><Layout><POS /></Layout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
          <Route path="/promotions" element={<ProtectedRoute><Layout><Promotions /></Layout></ProtectedRoute>} />

          <Route path="/admin" element={
            <ProtectedRoute requireRole="admin"><Layout><AdminPanel /></Layout></ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
