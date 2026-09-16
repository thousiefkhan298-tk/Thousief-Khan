import React, { useState, useEffect, useRef } from 'react';
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
  Utensils, 
  TrendingUp, 
  CreditCard,
  Sparkles,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Send,
  MessageSquare
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase.js';
import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    { id: 1, text: "Sarah Smith hasn't marked attendance for today's 10:00 AM Session.", type: "warning", time: "30 mins ago" },
    { id: 2, text: "AI Transformation Draft generated for Client James Miller.", type: "ai", time: "1 hour ago" },
    { id: 3, text: "Payment of ₹20,000 pending for Client Rohit Sharma.", type: "error", time: "2 hours ago" }
  ]);

  // Quick Add Menu State
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // AI Coach Drawer State
  const [showAICoachDrawer, setShowAICoachDrawer] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([
    { sender: 'ai', text: `Welcome to the Speed Fit Elite AI Command center. I have loaded all client parameters, workout charts, diet diaries, and session records into my cache. What analytical insights or coaching generation do you require today?` }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Theme Mode
  const [themeMode, setThemeMode] = useState<'red-and-black' | 'monochrome'>(() => {
    return (localStorage.getItem('theme-mode') as any) || 'red-and-black';
  });

  const isTrainer = userData?.role === 'TRAINER';
  const isClient = userData?.role === 'CLIENT';
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

  // Quick Action triggers
  const triggerQuickAction = (tab: string) => {
    setSearchParams({ tab });
    setShowQuickAdd(false);
  };

  // AI Coach interaction handler
  const handleSendMessageToAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiMessage.trim() || aiLoading) return;

    const userText = aiMessage;
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setAiMessage('');
    setAiLoading(true);

    try {
      // Gather context
      const response = await fetch('/api/ai-coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          clientContext: {
            currentUser: userData,
            currentActiveTab: currentTab,
            coachName: isTrainer ? userData?.name : 'Coach',
            role: userData?.role
          },
          chatHistory: chatHistory
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setChatHistory(prev => [...prev, { sender: 'ai', text: resData.reply }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'ai', text: "Error syncing parameters with elite coach node. Please retry." }]);
      }
    } catch (error) {
      console.error("AI Coach Error:", error);
      setChatHistory(prev => [...prev, { sender: 'ai', text: "Could not establish connection to the Speed Fit cloud service. Check your internet connection." }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Nav Items for Sidebar
  const trainerTabs = [
    { name: 'Dashboard', tab: 'dashboard', icon: Activity },
    { name: 'Attendance', tab: 'attendance', icon: CheckSquare },
    { name: 'Clients', tab: 'clients', icon: Users },
    { name: 'Check-ins', tab: 'checkins', icon: ClipboardList },
    { name: 'Pending Drafts', tab: 'drafts', icon: Zap },
    { name: 'Workouts', tab: 'workouts', icon: Dumbbell },
    { name: 'Diet Plans', tab: 'dietplans', icon: Utensils },
    { name: 'Reports', tab: 'reports', icon: TrendingUp },
    { name: 'Payments', tab: 'payments', icon: CreditCard },
    { name: 'Accounts Panel', tab: 'accounts', icon: CreditCard },
    { name: 'Calendar', tab: 'calendar', icon: Calendar },
    { name: 'Settings', tab: 'settings', icon: Settings },
  ];

  const clientTabs = [
    { name: 'Dashboard', tab: 'home', icon: Activity },
    { name: 'Workout', tab: 'workout', icon: Dumbbell },
    { name: 'Diet Plan', tab: 'diet', icon: Utensils },
    { name: 'Progress Track', tab: 'progress', icon: TrendingUp },
    { name: 'My Profile', tab: 'profile', icon: UserIcon },
  ];

  const activeTabsList = isTrainer ? trainerTabs : clientTabs;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col md:flex-row font-sans antialiased overflow-x-hidden">
      
      {/* LEFT SIDEBAR (Collapsible) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-[#1B1B1B] border-r border-[#2A2A2A] flex flex-col transition-all duration-300 transform md:relative md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarOpen ? 'w-72' : 'w-20'}`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {isSidebarOpen ? (
              <SpeedFitLogo />
            ) : (
              <div className="w-10 h-10 bg-[#E10600] text-white rounded-xl flex items-center justify-center font-display italic font-black text-xl shadow-[0_0_15px_rgba(225,6,0,0.4)]">
                SF
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="hidden md:flex p-1.5 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {activeTabsList.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setSearchParams({ tab: item.tab });
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3.5 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-[#E10600] text-white font-bold shadow-[0_4px_12px_rgba(225,6,0,0.3)]'
                    : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#FF3B30]'}`} />
                {isSidebarOpen && (
                  <span className="ml-3.5 text-xs font-semibold tracking-wider uppercase font-sub">{item.name}</span>
                )}
              </button>
            );
          })}

          {/* Dedicated AI Coach Tab inside Sidebar */}
          <button
            onClick={() => {
              setShowAICoachDrawer(true);
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center w-full px-4 py-3.5 rounded-xl transition-all duration-200 group text-left text-gray-400 hover:bg-[#2A2A2A] hover:text-white border border-dashed border-[#FF3B30]/30 mt-4"
          >
            <Sparkles className="w-5 h-5 shrink-0 text-[#FF3B30] animate-pulse" />
            {isSidebarOpen && (
              <span className="ml-3.5 text-xs font-bold tracking-wider uppercase text-[#FF3B30] font-sub">AI Coach Chat</span>
            )}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#2A2A2A] bg-[#141417]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF3B30] text-white rounded-xl flex items-center justify-center font-display italic font-black shadow-md">
              {userData?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate uppercase tracking-wider">{userData?.name || 'Athlete'}</p>
                <p className="text-[9px] font-mono text-[#FF3B30] truncate uppercase tracking-widest font-extrabold">{userData?.role || 'CLIENT'}</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all duration-200 mt-4 cursor-pointer`}
          >
            <LogOut size={16} className="shrink-0" />
            {isSidebarOpen && <span className="ml-3.5 font-bold">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT SPACE WITH TOP NAVIGATION */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#111111]">
        
        {/* TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-30 bg-[#111111]/90 backdrop-blur-md border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
          
          {/* Left section: Hamburger / Search */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-2 hover:bg-[#1B1B1B] rounded-lg text-white"
            >
              <Menu size={20} />
            </button>

            {/* Quick Title / Breadcrumb */}
            <div className="hidden sm:block">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-black">SPEED FIT HQ</span>
              <h2 className="text-sm font-bold tracking-tight text-white uppercase mt-0.5 font-display">
                {currentTab} CONTROL
              </h2>
            </div>
          </div>

          {/* Right section: Global Actions */}
          <div className="flex items-center gap-3.5">
            
            {/* Quick Add Button (Floating layout) */}
            {isTrainer && (
              <div className="relative">
                <button 
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="bg-[#E10600] hover:bg-[#FF3B30] text-white px-3.5 py-2 rounded-xl text-xs font-bold font-sub tracking-wider uppercase flex items-center gap-1.5 shadow-[0_4px_12px_rgba(225,6,0,0.3)] transition-all duration-300 hover:scale-105"
                >
                  <Plus size={14} />
                  <span className="hidden lg:inline">Quick Add</span>
                </button>
                {showQuickAdd && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in-50 slide-in-from-top-3">
                    <p className="text-[9px] font-mono font-bold uppercase text-gray-500 px-3 py-1.5">Coach Actions</p>
                    <button onClick={() => triggerQuickAction('clients')} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#2A2A2A] text-white">
                      Create Client Account
                    </button>
                    <button onClick={() => triggerQuickAction('workouts')} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#2A2A2A] text-white">
                      Build Custom Workout
                    </button>
                    <button onClick={() => triggerQuickAction('dietplans')} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#2A2A2A] text-white">
                      Configure Diet Program
                    </button>
                    <button onClick={() => triggerQuickAction('payments')} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#2A2A2A] text-white">
                      Generate Payment Ledger
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notifications panel */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-[#1B1B1B] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-gray-300 hover:text-white transition-colors relative"
              >
                <Bell size={16} />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF3B30] rounded-full animate-ping"></span>
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF3B30] rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1B1B1B] border border-[#2A2A2A] rounded-2xl shadow-xl p-3 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A] mb-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-white font-display">System Alerts</span>
                    <button onClick={() => setNotifications([])} className="text-[10px] font-mono text-red-500 hover:underline">Clear all</button>
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-center py-6 text-gray-500 font-mono">No new high-priority warnings.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-[#1F1F1F] border border-[#2A2A2A] text-xs">
                          <p className="font-semibold text-white">{n.text}</p>
                          <span className="text-[9px] font-mono text-gray-500 block mt-1">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme / Brand mode toggle */}
            <button 
              onClick={() => setThemeMode(themeMode === 'red-and-black' ? 'monochrome' : 'red-and-black')}
              className="p-2.5 bg-[#1B1B1B] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-gray-300 hover:text-white transition-colors"
              title="Toggle Premium Visual Accent"
            >
              {themeMode === 'red-and-black' ? <Sparkles size={16} className="text-[#FF3B30]" /> : <Moon size={16} className="text-white" />}
            </button>

            {/* Profile Avatar Trigger */}
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-90">
              <div className="w-9 h-9 bg-white text-black border border-[#2A2A2A] rounded-xl flex items-center justify-center font-display italic font-black text-sm">
                {userData?.name?.[0]?.toUpperCase() || 'P'}
              </div>
            </Link>
          </div>
        </header>

        {/* CONTAINER FOR CHILDREN PAGES */}
        {!isOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between gap-4 text-xs font-mono text-amber-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-bold uppercase tracking-wider">Offline Cache Mode Active</span>
              <span className="text-[10px] text-gray-400 font-sans hidden sm:inline">— Network connection was lost. You can continue log-keeping & viewing data safely; your changes will automatically synchronize with the cloud once connection is restored.</span>
            </div>
            <span className="text-[9px] uppercase px-2 py-0.5 bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded font-bold shrink-0">IndexedDB Cache Persistent</span>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>

      {/* FLOAT ACTION AI COACH DRAWER (Slide Panel) */}
      {showAICoachDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-full max-w-lg bg-[#1B1B1B] border-l border-[#2A2A2A] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between bg-[#111111]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E10600]" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">SPEED FIT AI COACH</h3>
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Cognitive Intelligence Node</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAICoachDrawer(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[#111111]">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed border ${
                    msg.sender === 'user' 
                      ? 'bg-[#E10600] border-[#FF3B30] text-white font-semibold rounded-br-none'
                      : 'bg-[#1F1F1F] border-[#2A2A2A] text-gray-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1F1F1F] border border-[#2A2A2A] p-4 rounded-2xl rounded-bl-none max-w-[80%] text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#E10600] rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-[#E10600] rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-[#E10600] rounded-full animate-bounce delay-200"></span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Synthesizing clinical metrics...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Footer */}
            <form onSubmit={handleSendMessageToAI} className="p-4 border-t border-[#2A2A2A] bg-[#1F1F1F] flex items-center gap-2">
              <input 
                type="text" 
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="Ask AI Coach for Workout, Diet, or Progress Reports..."
                className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#E10600] font-sans"
              />
              <button 
                type="submit"
                disabled={!aiMessage.trim() || aiLoading}
                className="p-3 bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl disabled:opacity-40 transition-all duration-200 shadow-md"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
