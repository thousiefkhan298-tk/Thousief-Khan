import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
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
  TrendingUp, 
  CreditCard,
  Sparkles,
  Bell,
  Plus,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  MoreHorizontal,
  Flame
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTrainerMoreOpen, setIsTrainerMoreOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Notification States
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Sarah Smith hasn't marked attendance for today's 10:00 AM session.", type: "warning", time: "30 mins ago" },
    { id: 2, text: "Draft routine generated for client James Miller.", type: "info", time: "1 hour ago" },
    { id: 3, text: "Payment of ₹20,000 pending for client Rohit Sharma.", type: "error", time: "2 hours ago" }
  ]);

  // Quick Add Menu State
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Theme Mode
  const [themeMode, setThemeMode] = useState<'red-and-black' | 'monochrome'>(() => {
    return (localStorage.getItem('theme-mode') as any) || 'red-and-black';
  });

  const isTrainer = userData?.role === 'TRAINER';
  const currentTab = searchParams.get('tab') || (isTrainer ? 'dashboard' : 'home');

  useEffect(() => {
    localStorage.setItem('theme-mode', themeMode);
    const event = new Event('theme-changed');
    window.dispatchEvent(event);
  }, [themeMode]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleTabClick = (tab: string) => {
    if (location.pathname !== '/dashboard') {
      navigate(`/dashboard?tab=${tab}`);
    } else {
      setSearchParams({ tab });
    }
    setIsMobileMenuOpen(false);
    setIsTrainerMoreOpen(false);
  };

  // Quick Action triggers
  const triggerQuickAction = (tab: string) => {
    if (location.pathname !== '/dashboard') {
      navigate(`/dashboard?tab=${tab}`);
    } else {
      setSearchParams({ tab });
    }
    setShowQuickAdd(false);
  };

  // Trainer Navigation Groups: Daily work and More
  const trainerDailyTabs = [
    { name: 'Home', tab: 'dashboard', icon: Activity },
    { name: 'Clients', tab: 'clients', icon: Users },
    { name: 'Sessions', tab: 'calendar', icon: Calendar },
    { name: 'Plans', tab: 'workouts', icon: Dumbbell },
    { name: 'Payments', tab: 'payments', icon: CreditCard },
  ];

  const trainerMoreTabs = [
    { name: 'Leads', tab: 'leads', icon: Flame },
    { name: 'Attendance', tab: 'attendance', icon: CheckSquare },
    { name: 'Check-ins', tab: 'checkins', icon: ClipboardList },
    { name: 'Drafts', tab: 'drafts', icon: Zap },
    { name: 'Reports', tab: 'reports', icon: TrendingUp },
    { name: 'Settings', tab: 'settings', icon: Settings },
  ];

  // Client Navigation: Home, My Plan, Sessions, Progress, Profile
  const clientTabs = [
    { name: 'Home', tab: 'home', icon: Activity },
    { name: 'My Plan', tab: 'myplan', icon: Dumbbell },
    { name: 'Sessions', tab: 'sessions', icon: Calendar },
    { name: 'Progress', tab: 'progress', icon: TrendingUp },
    { name: 'Profile', tab: 'profile', icon: UserIcon },
  ];

  const isTabActive = (tabKey: string) => {
    if (isTrainer) {
      if (tabKey === 'dashboard') return currentTab === 'dashboard' || !currentTab;
      if (tabKey === 'clients') return currentTab === 'clients';
      if (tabKey === 'calendar') return currentTab === 'calendar' || currentTab === 'sessions';
      if (tabKey === 'workouts') return currentTab === 'workouts' || currentTab === 'dietplans' || currentTab === 'plans';
      if (tabKey === 'payments') return currentTab === 'payments' || currentTab === 'accounts';
      if (tabKey === 'leads') return currentTab === 'leads';
      if (tabKey === 'attendance') return currentTab === 'attendance';
      if (tabKey === 'checkins') return currentTab === 'checkins';
      if (tabKey === 'drafts') return currentTab === 'drafts';
      if (tabKey === 'reports') return currentTab === 'reports';
      if (tabKey === 'settings') return currentTab === 'settings' || location.pathname === '/settings';
    } else {
      if (tabKey === 'home') return currentTab === 'home' || !currentTab;
      if (tabKey === 'myplan') return currentTab === 'myplan' || currentTab === 'workout' || currentTab === 'diet';
      if (tabKey === 'sessions') return currentTab === 'sessions';
      if (tabKey === 'progress') return currentTab === 'progress';
      if (tabKey === 'profile') return currentTab === 'profile' || currentTab === 'assessments' || currentTab === 'payments' || currentTab === 'terms' || location.pathname === '/profile';
    }
    return currentTab === tabKey;
  };

  const isMoreActive = isTrainer && ['leads', 'attendance', 'checkins', 'drafts', 'reports', 'settings'].includes(currentTab);

  const getPageHeading = () => {
    if (location.pathname.startsWith('/client/')) return 'Client details';
    if (location.pathname === '/profile') return 'Profile';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname === '/workout-templates') return 'Workout templates';
    if (location.pathname === '/workout-logs') return 'Workout logs';
    if (location.pathname === '/schedule') return 'Schedule';
    if (location.pathname === '/messages') return 'Messages';
    if (location.pathname === '/billing') return 'Billing';
    if (location.pathname === '/subscription') return 'Subscription';

    if (isTrainer) {
      switch (currentTab) {
        case 'dashboard': return 'Home';
        case 'clients': return 'Clients';
        case 'calendar':
        case 'sessions': return 'Sessions';
        case 'workouts':
        case 'plans': return 'Plans';
        case 'dietplans': return 'Diet plans';
        case 'payments': return 'Payments';
        case 'accounts': return 'Accounts ledger';
        case 'leads': return 'Leads & Assessments';
        case 'attendance': return 'Attendance';
        case 'checkins': return 'Check-ins';
        case 'drafts': return 'Drafts';
        case 'reports': return 'Reports';
        case 'settings': return 'Settings';
        default: return 'Trainer dashboard';
      }
    } else {
      switch (currentTab) {
        case 'home': return 'Home';
        case 'myplan':
        case 'workout':
        case 'diet': return 'My Plan';
        case 'sessions': return 'Sessions';
        case 'progress': return 'Progress';
        case 'profile':
        case 'assessments':
        case 'payments':
        case 'terms': return 'Profile';
        default: return 'Client dashboard';
      }
    }
  };

  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/';
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isTrainer ? '/dashboard?tab=dashboard' : '/dashboard?tab=home');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#F8FAFC] flex flex-col md:flex-row font-sans antialiased overflow-x-hidden">
      
      {/* LEFT SIDEBAR (Collapsible on Desktop) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-[#111114] border-r border-[#26262B] flex flex-col transition-all duration-300 transform md:relative md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarOpen ? 'w-72' : 'w-20'}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 sm:p-5 border-b border-[#26262B] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {isSidebarOpen ? (
              <SpeedFitLogo />
            ) : (
              <div className="w-10 h-10 bg-[#DC2626] text-white rounded-xl flex items-center justify-center font-display italic font-black text-xl shadow-[0_0_15px_rgba(220,38,38,0.35)]">
                SF
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden md:flex p-2.5 min-h-[44px] min-w-[44px] items-center justify-center hover:bg-[#1A1A20] rounded-xl transition-colors text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            aria-label="Close navigation menu"
            className="md:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[#1A1A20] rounded-xl text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-4 overflow-y-auto custom-scrollbar">
          {isTrainer ? (
            <>
              {/* Daily Work Group */}
              <div>
                {isSidebarOpen && (
                  <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                    Daily work
                  </p>
                )}
                <div className="space-y-1">
                  {trainerDailyTabs.map((item) => {
                    const Icon = item.icon;
                    const active = isTabActive(item.tab);
                    return (
                      <button
                        key={item.tab}
                        onClick={() => handleTabClick(item.tab)}
                        aria-label={item.name}
                        className={`flex items-center w-full px-3.5 py-3 min-h-[44px] rounded-xl transition-all duration-200 group text-left focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none ${
                          active
                            ? 'bg-[#DC2626] text-white font-bold shadow-[0_4px_12px_rgba(220,38,38,0.35)]'
                            : 'text-slate-300 hover:bg-[#1A1A20] hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#DC2626]'}`} />
                        {isSidebarOpen && (
                          <span className="ml-3 text-sm font-medium tracking-normal">{item.name}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* More Group */}
              <div className="pt-2 border-t border-[#26262B]">
                {isSidebarOpen && (
                  <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                    More
                  </p>
                )}
                <div className="space-y-1">
                  {trainerMoreTabs.map((item) => {
                    const Icon = item.icon;
                    const active = isTabActive(item.tab);
                    return (
                      <button
                        key={item.tab}
                        onClick={() => handleTabClick(item.tab)}
                        aria-label={item.name}
                        className={`flex items-center w-full px-3.5 py-3 min-h-[44px] rounded-xl transition-all duration-200 group text-left focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none ${
                          active
                            ? 'bg-[#DC2626] text-white font-bold shadow-[0_4px_12px_rgba(220,38,38,0.35)]'
                            : 'text-slate-300 hover:bg-[#1A1A20] hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#DC2626]'}`} />
                        {isSidebarOpen && (
                          <span className="ml-3 text-sm font-medium tracking-normal">{item.name}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Client Navigation */
            <div>
              {isSidebarOpen && (
                <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
                  Navigation
                </p>
              )}
              <div className="space-y-1">
                {clientTabs.map((item) => {
                  const Icon = item.icon;
                  const active = isTabActive(item.tab);
                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleTabClick(item.tab)}
                      aria-label={item.name}
                      className={`flex items-center w-full px-3.5 py-3 min-h-[44px] rounded-xl transition-all duration-200 group text-left focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none ${
                        active
                          ? 'bg-[#DC2626] text-white font-bold shadow-[0_4px_12px_rgba(220,38,38,0.35)]'
                          : 'text-slate-300 hover:bg-[#1A1A20] hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#DC2626]'}`} />
                      {isSidebarOpen && (
                        <span className="ml-3 text-sm font-medium tracking-normal">{item.name}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#26262B] bg-[#141417]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#DC2626] text-white rounded-xl flex items-center justify-center font-display italic font-black shadow-sm shrink-0">
              {userData?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{userData?.name || (isTrainer ? 'Trainer' : 'Client')}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate capitalize">{isTrainer ? 'Trainer' : 'Client'}</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex items-center w-full px-3.5 py-3 min-h-[44px] text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-xl text-xs font-semibold transition-all duration-200 mt-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus:outline-none"
          >
            <LogOut size={16} className="shrink-0 text-red-500" />
            {isSidebarOpen && <span className="ml-3">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0D0D0F]">
        
        {/* TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-30 bg-[#111114]/95 backdrop-blur-md border-b border-[#26262B] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          
          {/* Left section: Hamburger / Contextual Back / Page Heading */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              aria-label="Open navigation menu"
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[#1A1A20] rounded-xl text-slate-300 focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
            >
              <Menu size={22} />
            </button>

            {/* Contextual Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                aria-label="Go back to previous page"
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-[#18181C] hover:bg-[#222228] border border-[#26262B] text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
              >
                <ArrowLeft className="w-4 h-4 text-brand-red" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            {/* Page Heading in High-Visibility Layout Typography */}
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-brand-red block tracking-wider font-bold uppercase">Speed Fit</span>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate font-display uppercase">
                {getPageHeading()}
              </h1>
            </div>
          </div>

          {/* Right section: Global Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Add Button for Trainer */}
            {isTrainer && (
              <div className="relative">
                <button 
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  aria-label="Quick actions menu"
                  className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Add</span>
                </button>
                {showQuickAdd && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#141417] border border-[#26262B] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in-50 slide-in-from-top-3">
                    <p className="text-[10px] font-mono font-semibold uppercase text-slate-400 px-3 py-1.5">Quick actions</p>
                    <button 
                      onClick={() => triggerQuickAction('clients')} 
                      className="w-full text-left px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl hover:bg-[#1A1A20] text-slate-200 hover:text-white flex items-center"
                    >
                      Add client
                    </button>
                    <button 
                      onClick={() => triggerQuickAction('workouts')} 
                      className="w-full text-left px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl hover:bg-[#1A1A20] text-slate-200 hover:text-white flex items-center"
                    >
                      Create workout plan
                    </button>
                    <button 
                      onClick={() => triggerQuickAction('dietplans')} 
                      className="w-full text-left px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl hover:bg-[#1A1A20] text-slate-200 hover:text-white flex items-center"
                    >
                      Create diet plan
                    </button>
                    <button 
                      onClick={() => triggerQuickAction('leads')} 
                      className="w-full text-left px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl hover:bg-[#1A1A20] text-slate-200 hover:text-white flex items-center"
                    >
                      Leads pipeline
                    </button>
                    <button 
                      onClick={() => triggerQuickAction('payments')} 
                      className="w-full text-left px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl hover:bg-[#1A1A20] text-slate-200 hover:text-white flex items-center"
                    >
                      Record payment
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notifications panel */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="View system notifications"
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#18181C] hover:bg-[#222228] border border-[#26262B] rounded-xl text-slate-300 hover:text-white transition-colors relative focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#DC2626] rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#141417] border border-[#26262B] rounded-2xl shadow-2xl p-3 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-[#26262B] mb-2 px-1">
                    <span className="text-xs font-bold text-white">System notifications</span>
                    <button 
                      onClick={() => setNotifications([])} 
                      className="text-xs text-red-400 hover:underline min-h-[44px] px-2 flex items-center"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-center py-6 text-slate-400">No new notifications.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 rounded-xl bg-[#18181C] border border-[#26262B] text-xs">
                          <p className="font-medium text-white">{n.text}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme mode toggle */}
            <button 
              onClick={() => setThemeMode(themeMode === 'red-and-black' ? 'monochrome' : 'red-and-black')}
              aria-label="Toggle visual theme accent"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#18181C] hover:bg-[#222228] border border-[#26262B] rounded-xl text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none"
            >
              {themeMode === 'red-and-black' ? <Sparkles size={18} className="text-[#DC2626]" /> : <Moon size={18} className="text-slate-300" />}
            </button>

            {/* Profile Avatar Link */}
            <Link 
              to="/profile" 
              aria-label="View user profile"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#DC2626] rounded-xl focus:outline-none"
            >
              <div className="w-9 h-9 bg-[#18181C] text-white border border-[#26262B] rounded-xl flex items-center justify-center font-display italic font-black text-sm">
                {userData?.name?.[0]?.toUpperCase() || 'P'}
              </div>
            </Link>
          </div>
        </header>

        {/* Offline Cache Indicator */}
        {!isOnline && (
          <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-semibold">Offline mode active</span>
              <span className="text-[11px] text-amber-400 hidden sm:inline">— Data is saved locally and will synchronize when back online.</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-amber-900/60 rounded font-medium shrink-0">Cached</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-28 md:pb-8 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION - TRAINER */}
      {isTrainer && (
        <nav 
          aria-label="Trainer mobile navigation" 
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111114]/95 border-t border-[#26262B] px-1 py-1.5 flex items-center justify-around backdrop-blur-lg shadow-md safe-area-inset-bottom"
        >
          {trainerDailyTabs.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.tab);
            return (
              <button
                key={item.tab}
                onClick={() => handleTabClick(item.tab)}
                aria-label={item.name}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none ${
                  active ? 'text-[#DC2626]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={19} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className={`text-[10px] tracking-normal mt-0.5 ${active ? 'font-bold text-[#DC2626]' : 'font-normal text-slate-400'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
          {/* More Button */}
          <button
            onClick={() => setIsTrainerMoreOpen(!isTrainerMoreOpen)}
            aria-label="More options"
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none ${
              isMoreActive ? 'text-[#DC2626]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MoreHorizontal size={19} className={isMoreActive ? 'stroke-[2.5]' : 'stroke-2'} />
            <span className={`text-[10px] tracking-normal mt-0.5 ${isMoreActive ? 'font-bold text-[#DC2626]' : 'font-normal text-slate-400'}`}>
              More
            </span>
            {isMoreActive && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-[#DC2626] rounded-full"></span>
            )}
          </button>
        </nav>
      )}

      {/* TRAINER MORE BOTTOM SHEET (Mobile) */}
      {isTrainer && isTrainerMoreOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setIsTrainerMoreOpen(false)}
        >
          <div 
            className="bg-[#141417] border-t border-[#26262B] rounded-t-3xl p-5 pb-8 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26262B]">
              <h3 className="text-sm font-bold text-white">More management pages</h3>
              <button 
                onClick={() => setIsTrainerMoreOpen(false)} 
                aria-label="Close more options menu"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {trainerMoreTabs.map((item) => {
                const Icon = item.icon;
                const active = isTabActive(item.tab);
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleTabClick(item.tab)}
                    className={`flex items-center gap-3 p-3.5 min-h-[48px] rounded-xl text-left border transition-all ${
                      active
                        ? 'bg-[#DC2626] border-[#DC2626] text-white font-bold'
                        : 'bg-[#18181C] border-[#26262B] text-slate-200 hover:bg-[#222228]'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-white' : 'text-[#DC2626]'} />
                    <span className="text-xs font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION - CLIENT */}
      {!isTrainer && (
        <nav 
          aria-label="Client mobile navigation" 
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111114]/95 border-t border-[#26262B] px-2 py-1.5 flex items-center justify-around backdrop-blur-lg shadow-md safe-area-inset-bottom"
        >
          {clientTabs.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.tab);
            return (
              <button
                key={item.tab}
                onClick={() => handleTabClick(item.tab)}
                aria-label={item.name}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2.5 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#DC2626] focus:outline-none ${
                  active ? 'text-[#DC2626]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={19} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className={`text-[10px] tracking-normal mt-0.5 ${active ? 'font-bold text-[#DC2626]' : 'font-normal text-slate-400'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Layout;
