
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, testFirebaseConnection } from './firebase.js';
import LoginPage from './pages/Auth/LoginPage.js';
import Landing from './pages/Landing';
import SignupPage from './pages/Auth/SignupPage.js';
import Dashboard from './pages/Dashboard.js';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow.js';
import WorkoutLogs from './pages/WorkoutLogs/index.js';
import WorkoutTemplates from './pages/WorkoutTemplates/index.js';
import Messages from './pages/Messages/index.js';
import Schedule from './pages/Schedule/index.js';
import ClientProfile from './pages/ClientProfile/index.js';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Billing from './pages/Billing/index.js';
import Subscription from './pages/Subscription/index.js';

import ErrorBoundary from './components/ErrorBoundary';

import { notificationService } from './services/notificationService';
import { firebaseService } from './services/firebaseService';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifiedSessions, setNotifiedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const applyTheme = () => {
      const mode = localStorage.getItem('theme-mode') || 'red-and-black';
      document.documentElement.classList.add('trainer-dark-theme');
      if (mode === 'monochrome') {
        document.documentElement.classList.add('theme-monochrome');
      } else {
        document.documentElement.classList.remove('theme-monochrome');
      }
    };
    applyTheme();
    window.addEventListener('theme-changed', applyTheme);
    return () => {
      window.removeEventListener('theme-changed', applyTheme);
    };
  }, []);

  useEffect(() => {
    testFirebaseConnection();
    notificationService.registerServiceWorker();
    let userUnsubscribe: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed, user:", firebaseUser ? firebaseUser.uid : "null");
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser) {
        userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          console.log("User doc updated in real-time, exists:", docSnap.exists());
          if (docSnap.exists()) {
            setUser({ ...firebaseUser, ...docSnap.data() });
          } else {
            setUser(firebaseUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user doc:", error);
          setUser(firebaseUser);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || user.role !== 'CLIENT') return;

    const unsubscribeSessions = firebaseService.subscribeToUpcomingSessions(user.uid, (sessions) => {
      if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification || window.Notification.permission !== 'granted') return;

      const now = new Date();
      sessions.forEach(session => {
        const sessionDate = new Date(session.date);
        const diffMs = sessionDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        const sessionKey15 = `${session.id}-15`;
        const sessionKeyNow = `${session.id}-0`;

        // If session is in 60 minutes, send a notification
        if (diffMins <= 60 && diffMins > 45 && !notifiedSessions.has(sessionKey15)) {
          notificationService.sendLocalNotification('Upcoming Session Reminder', {
            body: `Your session starts in ~1 hour at ${sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          });
          
          // Also send a system message to Firestore so it's in the chat history
          firebaseService.sendMessage({
            senderId: 'SYSTEM',
            receiverId: user.uid,
            participants: [user.uid, 'SYSTEM'],
            content: `Reminder: Your session is starting soon at ${sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`,
            timestamp: new Date().toISOString(),
            read: false
          }).catch(console.error);

          setNotifiedSessions(prev => new Set(prev).add(sessionKey15));
        }
        
        // If session is starting now
        if (diffMins === 0 && !notifiedSessions.has(sessionKeyNow)) {
          notificationService.sendLocalNotification('Session Starting Now!', {
            body: 'Time to get to work! Your session is starting.'
          });
          setNotifiedSessions(prev => new Set(prev).add(sessionKeyNow));
        }
      });
    });

    return () => unsubscribeSessions();
  }, [user?.uid, notifiedSessions]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white font-mono text-xs uppercase tracking-widest">Initializing Systems...</div>;
  }

  const requireOnboarding = user && user.role === 'CLIENT' && !user.onboardingCompleted;

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={user ? (requireOnboarding ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : <Landing />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
          <Route path="/onboarding" element={user ? (requireOnboarding ? <OnboardingFlow user={user} userData={user} /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? (!requireOnboarding ? <Dashboard user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/workout-logs" element={user ? (!requireOnboarding ? <WorkoutLogs user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/workout-templates" element={user ? (!requireOnboarding ? <WorkoutTemplates user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/messages" element={user ? (!requireOnboarding ? <Messages /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/schedule" element={user ? (!requireOnboarding ? <Schedule user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/client/:id" element={user ? (!requireOnboarding ? <ClientProfile /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/billing" element={user ? (!requireOnboarding ? <Billing /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/subscription" element={user ? (!requireOnboarding ? <Subscription /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? (!requireOnboarding ? <Profile user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? (!requireOnboarding ? <Settings user={user} /> : <Navigate to="/onboarding" />) : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
