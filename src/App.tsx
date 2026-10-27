
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import LoginPage from './pages/Auth/LoginPage.js';
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
import PublicAssessmentPage from './pages/Assessment/PublicAssessmentPage';

import ErrorBoundary from './components/ErrorBoundary';

import { notificationService } from './services/notificationService';
import { firebaseService } from './services/firebaseService';
import { requiresOnboarding, resolveRole } from './services/profileIdentity';
import { claimPlaceholderAccount } from './services/accountLinking';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [notifiedSessions, setNotifiedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const applyTheme = () => {
      const mode = localStorage.getItem('theme-mode') || 'red-and-black';
      
      if (user?.role === 'CLIENT') {
        document.documentElement.classList.add('client-red-black');
        document.documentElement.classList.remove('trainer-dark-theme');
      } else {
        document.documentElement.classList.add('trainer-dark-theme');
        document.documentElement.classList.remove('client-red-black');
      }

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
  }, [user]);

  useEffect(() => {
    let active = true;
    let userUnsubscribe: (() => void) | null = null;
    let profileTimer: ReturnType<typeof setTimeout>;
    const clearTimer = () => clearTimeout(profileTimer);
    const failProfile = (message: string) => {
      if (!active) return;
      clearTimer();
      setUser(null);
      setProfileError(message);
      setLoading(false);
    };
    const waitForProfile = () => {
      clearTimer();
      profileTimer = setTimeout(() => failProfile(
        'Your sign-in or profile could not finish loading. Check your connection and retry. If this continues, ask your trainer to check your account and database access.'
      ), 15000);
    };
    waitForProfile();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      userUnsubscribe?.();
      userUnsubscribe = null;
      clearTimer();
      setUser(null);
      setProfileError('');

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      waitForProfile();
      userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
        if (!active || auth.currentUser?.uid !== firebaseUser.uid) return;
        if (!docSnap.exists()) {
          // Login/signup may still be linking the account. Auto-trigger claim to ensure canonical doc is initialized.
          if (firebaseUser.email) {
            claimPlaceholderAccount(firebaseUser.uid, firebaseUser.email).catch((e: any) => {
              console.warn("Auto-claim on snapshot missing:", e?.message);
            });
          }
          setUser(null);
          setLoading(true);
          waitForProfile();
          return;
        }
        clearTimer();
        setProfileError('');
        setUser({
          ...firebaseUser,
          ...docSnap.data(),
          uid: firebaseUser.uid,
          id: firebaseUser.uid,
          email: firebaseUser.email,
          role: resolveRole(firebaseUser.email),
        });
        setLoading(false);
      }, (error) => {
        console.error('Unable to load Speed Fit profile:', error.code);
        failProfile('Signed in, but your Speed Fit profile could not be read. Ask the app owner to check the database connection and access rules.');
      });
    }, () => failProfile('Sign-in could not be initialized. Check your connection and retry.'));

    return () => {
      active = false;
      clearTimer();
      unsubscribe();
      userUnsubscribe?.();
    };
  }, [profileAttempt]);

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

  const retryProfile = async () => {
    setRecovering(true);
    setRecoveryNotice('');
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.reload();
        await currentUser.getIdToken(true);
        if (currentUser.email) await claimPlaceholderAccount(currentUser.uid, currentUser.email);
      }
      setProfileError('');
      setLoading(true);
      setProfileAttempt(value => value + 1);
    } catch (error: any) {
      setRecoveryNotice(error.message || 'Your profile is still unavailable. Please contact your trainer.');
    } finally {
      setRecovering(false);
    }
  };

  const verifyEmail = async () => {
    if (!auth.currentUser) return;
    setRecovering(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setRecoveryNotice('Check your inbox, follow the verification link, then choose Retry.');
    } catch {
      setRecoveryNotice('The verification email could not be sent. Please try again later.');
    } finally {
      setRecovering(false);
    }
  };

  if (profileError) {
    return (
      <div className="min-h-screen flex flex-col gap-6 items-center justify-center bg-brand-dark text-white p-8">
        <h1 className="text-2xl">Unable to open your dashboard</h1>
        <p role="alert" className="max-w-lg text-center">{profileError}</p>
        {recoveryNotice && <p role="status" className="max-w-lg text-center">{recoveryNotice}</p>}
        {auth.currentUser && !auth.currentUser.emailVerified && (
          <button disabled={recovering} onClick={verifyEmail}>Send verification email</button>
        )}
        <button className="btn-primary" disabled={recovering} onClick={retryProfile}>{recovering ? 'Please wait...' : 'Retry'}</button>
        <button disabled={recovering} onClick={() => signOut(auth).catch(() => setProfileError('Could not sign out. Please check your connection.'))}>Sign out</button>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white font-mono text-xs uppercase tracking-widest">Initializing Systems...</div>;
  }

  const requireOnboarding = user && requiresOnboarding(user);

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={user ? (requireOnboarding ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} />
          <Route path="/assessment" element={<PublicAssessmentPage />} />
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
