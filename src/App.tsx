
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, testFirebaseConnection } from './firebase';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import Dashboard from './pages/Dashboard';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow';
import WorkoutLogs from './pages/WorkoutLogs';
import Messages from './pages/Messages';
import Schedule from './pages/Schedule';
import ClientProfile from './pages/ClientProfile';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testFirebaseConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed, user:", firebaseUser ? firebaseUser.uid : "null");
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          console.log("User doc exists:", userDoc.exists());
          if (userDoc.exists()) {
            setUser({ ...firebaseUser, ...userDoc.data() });
          } else {
            setUser(firebaseUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(firebaseUser); // Still set user so they can at least see something or be redirected to onboarding
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white font-mono text-xs uppercase tracking-widest">Initializing Systems...</div>;
  }

  const requireOnboarding = user && user.role === 'CLIENT' && !user.onboardingCompleted;

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={user ? (requireOnboarding ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
          <Route path="/onboarding" element={user ? (requireOnboarding ? <OnboardingFlow user={user} userData={user} /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? (!requireOnboarding ? <Dashboard user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/workout-logs" element={user ? (!requireOnboarding ? <WorkoutLogs user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/messages" element={user ? (!requireOnboarding ? <Messages /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/schedule" element={user ? (!requireOnboarding ? <Schedule user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/client/:id" element={user ? (!requireOnboarding ? <ClientProfile /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? (!requireOnboarding ? <Profile user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? (!requireOnboarding ? <Settings user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
