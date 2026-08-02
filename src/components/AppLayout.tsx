import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ClipboardList, Dumbbell, Apple, 
  CreditCard, Calendar, BarChart3, MessageSquare, Settings, LogOut,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { SpeedFitLogo } from './SpeedFitLogo';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { name: 'Clients', path: '/clients', icon: <Users size={20} /> },
  { name: 'Attendance', path: '/attendance', icon: <ClipboardList size={20} /> },
  { name: 'Workout', path: '/workout', icon: <Dumbbell size={20} /> },
  { name: 'Diet', path: '/diet', icon: <Apple size={20} /> },
  { name: 'Payments', path: '/payments', icon: <CreditCard size={20} /> },
  { name: 'Sessions', path: '/sessions', icon: <Calendar size={20} /> },
  { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
  { name: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#111111] text-white overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col border-r border-[#2A2A2A] transition-all duration-300 bg-[#111111]",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <SpeedFitLogo />}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#1F1F1F] rounded-lg">
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                location.pathname === item.path 
                  ? "bg-[#E10600] text-white" 
                  : "text-gray-400 hover:bg-[#1F1F1F] hover:text-white"
              )}
            >
              {item.icon}
              {isSidebarOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2A2A2A]">
          <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded-xl">
            <Settings size={20} />
            {isSidebarOpen && <span>Settings</span>}
          </Link>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-red-500 hover:bg-[#1F1F1F] rounded-xl">
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#111111] p-8">
        {children}
      </main>
    </div>
  );
};
