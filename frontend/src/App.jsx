import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Predictions from './pages/Predictions';
import Reminders from './pages/Reminders';
import AgentAI from './pages/AgentAI';

const ProtectedLayout = ({ children, title, subtitle }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} subtitle={subtitle} />
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedLayout title="Dashboard" subtitle="Overview of your payment operations">
          <Dashboard />
        </ProtectedLayout>
      } />
      <Route path="/customers" element={
        <ProtectedLayout title="Customers" subtitle="Manage your customer accounts">
          <Customers />
        </ProtectedLayout>
      } />
      <Route path="/invoices" element={
        <ProtectedLayout title="Invoices" subtitle="Track all invoices and payment status">
          <Invoices />
        </ProtectedLayout>
      } />
      <Route path="/predictions" element={
        <ProtectedLayout title="AI Risk Predictions" subtitle="ML-powered payment delay analysis">
          <Predictions />
        </ProtectedLayout>
      } />
      <Route path="/reminders" element={
        <ProtectedLayout title="AI Email Reminders" subtitle="Generate and send payment reminders">
          <Reminders />
        </ProtectedLayout>
      } />
      <Route path="/agent" element={
        <ProtectedLayout title="Agentic AI Planner" subtitle="Claude autonomously plans your collections">
          <AgentAI />
        </ProtectedLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
