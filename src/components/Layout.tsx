import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { SpeedFitLogo } from './SpeedFitLogo';
import { 
  LogOut, 
  User as UserIcon, 
  Activity, 
  Calendar, 
  Settings, 
  ClipboardList, 
  Zap, 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  Dumbbell, 
  Utensils, 
  TrendingUp, 
  CreditCard,
  Sparkles
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

interface LayoutProps {
  children: React.ReactNode;
  userData: any;
}

const Layout: React.FC<LayoutProps> = ({ children, userData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const isTrainer = userData?.role === 'TRAINER';
  const isClient = userData?.role === 'CLIENT';

  const currentTab = searchParams.get('tab') || (isTrainer ? 'dashboard' : 'home');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Redirection logic to keep existing page routes unified under /dashboard tab hierarchy
  useEffect(() => {
    if (isClient) {
      if (location.pathname === '/profile' || location.pathname === '/settings') {
        navigate('/dashboard?tab=profile', { replace: true });
      } else if (location.pathname === '/workout-logs') {
        navigate('/dashboard?tab=workout', { replace: true });
      } else if (location.pathname === '/schedule') {
        navigate('/dashboard?tab=workout', { replace: true });
      }
    }
  }, [location.pathname, isClient, navigate]);

  // Client bottom navigation items (exactly 5 tabs)
  const clientTabs = [
    { name: 'Home', tab: 'home', icon: Activity },
    { name: 'Workout', tab: 'workout', icon: Dumbbell },
    { name: 'Diet', tab: 'diet', icon: Utensils },
    { name: 'Subscription', tab: 'subscription', icon: CreditCard },
    { name: 'Profile', tab: 'profile', icon: UserIcon },
  ];

  // Trainer professional sidebar items
  const trainerTabs = [
    { name: 'Dashboard', tab: 'dashboard', icon: Activity },
    { name: 'Attendance Page', tab: 'attendance', icon: CheckSquare },
    { name: 'Clients', tab: 'clients', icon: Users },
    { name: 'Check-ins', tab: 'checkins', icon: ClipboardList },
    { name: 'Pending Drafts', tab: 'drafts', icon: Zap },
    { name: 'Workouts', tab: 'workouts', icon: Dumbbell },
    { name: 'Diet Plans', tab: 'dietplans', icon: Utensils },
    { name: 'Reports', tab: 'reports', icon: TrendingUp },
    { name: 'Accounts Panel', tab: 'accounts', icon: CreditCard },
    { name: 'Payments', tab: 'payments', icon: CreditCard },
    { name: 'Billing', tab: 'billing', icon: CreditCard },
    { name: 'Calendar', tab: 'calendar', icon: Calendar },
    { name: 'Settings', tab: 'settings', icon: Settings },
  ];

  if (isClient) {
    const isDark = true;
    return (
      <div className="client-red-black min-h-screen pb-32 flex flex-col font-sans transition-all duration-300 antialiased bg-transparent text-slate-100">
        {/* Modern Top Header Banner */}
        <header className="sticky top-0 border-b px-6 py-4 flex items-center justify-between z-40 transition-colors duration-300 bg-[#0d0d0f]/90 border-[#1e1e24] backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold transition-all bg-[#0A0A0A] text-brand-red border border-neutral-800">
              SPEED FIT ELITE ACTIVE
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/dashboard?tab=profile" className="flex items-center space-x-3 hover:opacity-95 transition-opacity">
              {userData?.photoURL ? (
                <img 
                  src={userData.photoURL} 
                  alt={userData.name} 
                  className="w-10 h-10 rounded-full object-cover border-2 shadow-sm border-brand-red"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-white text-black border-2 border-brand-red rounded-full flex items-center justify-center font-display italic font-black">
                  {userData?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black tracking-tight text-white uppercase">{userData?.name || 'Athlete'}</p>
                <p className="text-[9px] font-mono uppercase tracking-wider text-brand-red font-bold">MEMBER LEVEL</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-8 pb-40 md:px-8">
          {children}
        </main>

        {/* Center-Floating Premium Bottom Dock (Oura/Apple Health Style) */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md border-2 shadow-[0_12px_40px_rgba(255,0,0,0.15)] px-6 py-3.5 rounded-[24px] flex items-center justify-between z-50 transition-all duration-300 bg-[#141417]/95 border-[#e60000] text-white">
          {clientTabs.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  if (['billing', 'subscription'].includes(item.tab)) {
                    navigate(`/${item.tab}`);
                  } else {
                    setSearchParams({ tab: item.tab });
                  }
                  setIsMobileMenuOpen(false);
                }}
                className="flex flex-col items-center justify-center space-y-1 relative group cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-brand-red text-white scale-110 shadow-[0_0_15px_rgba(255,0,0,0.35)]' 
                    : 'text-neutral-500 hover:text-white'
                }`}>
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />
                </div>
                <span className={`text-[9px] font-mono tracking-widest uppercase font-bold ${
                  isActive 
                    ? 'text-brand-red' 
                    : 'text-neutral-500'
                }`}>
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-white"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Trainer layout (professional SaaS dashboard with solid black base, white elements, and sharp red accents)
  return (
    <div className="trainer-dark-theme min-h-screen bg-transparent text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-300 antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#141417]/95 text-white border-b-2 border-[#e60000]">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-brand-red" />
          <span className="font-mono text-[9px] uppercase tracking-wider">Back</span>
        </button>
        <div className="speedfit-logo text-white">
          <SpeedFitLogo />
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white text-xs font-mono tracking-widest font-bold bg-brand-red px-3 py-1.5 rounded-lg">
          {isMobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* Trainer Sidebar with professional #0A0A0A black/grey theme */}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-[#141417]/95 flex-col z-20 min-w-[280px] border-r border-[#1e1e24]`}>
        <div className="p-8 border-b border-white/5 hidden md:block">
          <div className="text-white text-3xl font-display font-bold italic uppercase tracking-tighter">
            SPEED<span className="text-brand-red">FIT</span>
          </div>
          <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-white/50 font-bold mt-1">COACH PORTAL</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {trainerTabs.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  if (item.tab === 'billing') {
                    navigate('/billing');
                  } else {
                    setSearchParams({ tab: item.tab });
                  }
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-3.5 px-4 py-3.5 w-full rounded-2xl text-[11px] font-mono uppercase tracking-widest transition-all group cursor-pointer text-left ${
                  isActive
                    ? 'bg-brand-red text-white shadow-[0_4px_12px_rgba(255,0,0,0.15)] font-black border-l-4 border-black'
                    : 'text-white/70 hover:bg-neutral-900 hover:text-white font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-brand-red'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Trainer Session Details / Profile Block */}
        <div className="p-6 border-t border-[#1e1e24] bg-transparent">
          <div className="bg-white/5 p-4 rounded-2xl mb-4 border border-white/5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-red text-white rounded-xl flex items-center justify-center font-display italic text-lg shadow-sm">
                {userData?.name?.[0]?.toUpperCase() || 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate uppercase tracking-wider">{userData?.name || 'Coach'}</p>
                <p className="text-[8px] font-mono text-white/50 truncate uppercase font-bold tracking-widest">{userData?.role || 'Trainer'}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3.5 w-full text-white/60 hover:bg-brand-red hover:text-white rounded-2xl font-mono text-[10px] uppercase tracking-widest transition-all group cursor-pointer"
          >
            <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform text-white/40 group-hover:text-white" />
            <span>Sign Out Workspace</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar relative flex flex-col bg-transparent">
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
