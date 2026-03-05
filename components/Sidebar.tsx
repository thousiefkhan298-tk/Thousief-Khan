
import React, { useState } from 'react';
import { UserRole } from '../types';
import Logo from './Logo';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const trainerTabs = [
    { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
    { id: 'clients', icon: 'fa-users', label: 'Clients' },
    { id: 'workouts', icon: 'fa-dumbbell', label: 'Workouts' },
    { id: 'diet', icon: 'fa-apple-whole', label: 'Diet Plans' },
    { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
    { id: 'payments', icon: 'fa-credit-card', label: 'Payments' },
    { id: 'messages', icon: 'fa-comments', label: 'Messages' },
    { id: 'setup', icon: 'fa-database', label: 'DB Setup' },
  ];

  const clientTabs = [
    { id: 'workout', icon: 'fa-dumbbell', label: 'My Workout' },
    { id: 'diet', icon: 'fa-apple-whole', label: 'My Diet' },
    { id: 'attendance', icon: 'fa-calendar-check', label: 'My Progress' },
    { id: 'photos', icon: 'fa-camera', label: 'Progress Photos' },
    { id: 'messages', icon: 'fa-comments', label: 'Messages' },
    { id: 'notifications', icon: 'fa-bell', label: 'Notifications' },
  ];

  const tabs = role === UserRole.TRAINER ? trainerTabs : clientTabs;

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-6 left-6 z-50 w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-lime-500 shadow-lg"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        w-64 h-full bg-neutral-900 border-r border-neutral-800 flex flex-col fixed left-0 top-0 z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-2">
            <Logo size={32} />
            <h1 className="text-2xl font-black text-lime-500 brand-font italic tracking-tighter">SPEED FIT</h1>
          </div>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Built to Transform</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === tab.id 
                ? 'bg-lime-500 text-black font-bold accent-glow' 
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <i className={`fas ${tab.icon} ${activeTab === tab.id ? 'text-black' : 'text-neutral-500 group-hover:text-lime-500'}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
