
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { store } from './store';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow';
import TrainerDashboard from './pages/Trainer/TrainerDashboard';
import ClientDashboard from './pages/Client/ClientDashboard';
import BackgroundSlideshow from './components/BackgroundSlideshow';
import SplashScreen from './components/SplashScreen';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(store.getCurrentUser());
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<'LOGIN' | 'SIGNUP' | 'DASHBOARD' | 'ONBOARDING'>(
    currentUser ? (currentUser.onboardingCompleted || currentUser.role === UserRole.TRAINER ? 'DASHBOARD' : 'ONBOARDING') : 'LOGIN'
  );

  useEffect(() => {
    if (currentUser) {
      // Mark as online
      store.updateUserStatus(currentUser.id, true);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          store.updateUserStatus(currentUser.id, true);
        } else {
          store.updateUserStatus(currentUser.id, false);
        }
      };

      const handleBeforeUnload = () => {
        store.updateUserStatus(currentUser.id, false);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        store.updateUserStatus(currentUser.id, false);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === UserRole.TRAINER) {
        setView('DASHBOARD');
      } else if (currentUser.onboardingCompleted) {
        setView('DASHBOARD');
      } else {
        setView('ONBOARDING');
      }
    } else {
      // Only reset to LOGIN if we are not already on SIGNUP page
      setView(prev => prev === 'SIGNUP' ? 'SIGNUP' : 'LOGIN');
    }
  }, [currentUser]);

  const handleLogout = () => {
    store.setCurrentUser(null);
    setCurrentUser(null);
    setView('LOGIN');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    store.setCurrentUser(user);
  };

  const handleOnboardingComplete = async (updatedName: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, onboardingCompleted: true, name: updatedName };
      try {
        await store.saveUser(updatedUser);
        store.setCurrentUser(updatedUser);
        setCurrentUser(updatedUser);
        setView('DASHBOARD');
      } catch (err) {
        alert('Failed to sync data with server.');
      }
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'LOGIN':
        return <LoginPage onLoginSuccess={handleLoginSuccess} onToggleView={() => setView('SIGNUP')} />;
      case 'SIGNUP':
        return <SignupPage onSignupSuccess={handleLoginSuccess} onToggleView={() => setView('LOGIN')} />;
      case 'ONBOARDING':
        return <OnboardingFlow onComplete={handleOnboardingComplete} user={currentUser!} />;
      case 'DASHBOARD':
        return currentUser?.role === UserRole.TRAINER ? 
          <TrainerDashboard onLogout={handleLogout} /> : 
          <ClientDashboard user={currentUser!} onLogout={handleLogout} />;
      default:
        return <LoginPage onLoginSuccess={handleLoginSuccess} onToggleView={() => setView('SIGNUP')} />;
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-lime-500 selection:text-black relative">
      <BackgroundSlideshow />
      <div className="relative z-10">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
