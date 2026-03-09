
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import Dashboard from './pages/Dashboard';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow';
import WorkoutLogs from './pages/WorkoutLogs';
import Messages from './pages/Messages';
import ClientProfile from './pages/ClientProfile';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white font-mono text-xs uppercase tracking-widest">Initializing Systems...</div>;
  }

  const requireOnboarding = user && user.role === 'CLIENT' && !user.onboardingCompleted;

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={user ? (requireOnboarding ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
        <Route path="/onboarding" element={user ? (requireOnboarding ? <OnboardingFlow user={user} userData={user} /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? (!requireOnboarding ? <Dashboard /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
        <Route path="/workout-logs" element={user ? (!requireOnboarding ? <WorkoutLogs /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
        <Route path="/messages" element={user ? (!requireOnboarding ? <Messages /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
        <Route path="/client/:id" element={user ? (!requireOnboarding ? <ClientProfile /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
