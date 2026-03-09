import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { LogOut, User as UserIcon, Activity, Calendar, Settings, ClipboardList, MessageSquare, Zap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  userData: any;
}

const Layout: React.FC<LayoutProps> = ({ children, userData }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const messages = await api.getUnreadMessages();
        setUnreadCount(messages.length);
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    api.logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: Activity },
    { name: 'Workout Logs', path: '/workout-logs', icon: ClipboardList },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Schedule', path: '#', icon: Calendar },
    { name: 'Profile', path: '#', icon: UserIcon },
    { name: 'Settings', path: '#', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex">
      {/* Sidebar */}
      <aside className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col z-20">
        <div className="p-8 border-b border-neutral-800">
          <div className="speedfit-logo text-2xl">
            <Zap className="w-6 h-6 text-brand-red mr-2 fill-current" />
            SPEED<span>FIT</span>
          </div>
          <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-neutral-400 mt-1">BUILD TO TRANSFORMATION</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-4 px-5 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest transition-all group ${
                  isActive
                    ? 'bg-brand-red text-white shadow-[0_0_20px_rgba(255,0,0,0.2)]'
                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-600 group-hover:text-brand-red'}`} />
                <span>{item.name}</span>
                {item.name === 'Messages' && unreadCount > 0 && (
                  <span className="ml-auto bg-brand-red text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-neutral-800">
          <div className="bg-neutral-800/50 p-4 rounded-2xl mb-4 border border-neutral-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center font-display italic text-lg">
                {userData?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white truncate uppercase tracking-wider">{userData?.name || 'Athlete'}</p>
                <p className="text-[8px] font-mono text-neutral-500 truncate uppercase">{userData?.role || 'Recruit'}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-4 px-5 py-4 w-full text-neutral-500 hover:bg-red-950/30 hover:text-brand-red rounded-2xl font-mono text-[10px] uppercase tracking-widest transition-all group"
          >
            <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto custom-scrollbar relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
