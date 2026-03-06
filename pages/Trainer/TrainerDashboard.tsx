
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Logo from '../../components/Logo';
import { UserRole, User } from '../../types';
import { store } from '../../store';
import { socket } from '../../socket';
import ClientManagement from './tabs/ClientManagement';
import WorkoutEditor from './tabs/WorkoutEditor';
import DietEditor from './tabs/DietEditor';
import AttendanceManager from './tabs/AttendanceManager';
import PaymentManager from './tabs/PaymentManager';
import Overview from './tabs/Overview';
import DatabaseSetup from './DatabaseSetup';
import Messages from './tabs/Messages';

interface TrainerDashboardProps {
  onLogout: () => void;
}

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [clients, setClients] = useState<User[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const fetchClients = async () => {
    const allClients = await store.getAllClients();
    setClients(allClients);
    // Assuming the trainer is the first user with TRAINER role or we get it from auth context
    // For now, let's just find the trainer from the users list if possible, or assume a fixed ID if we had auth
    // Since we don't have a robust auth context provider here, we'll fetch the current user
    const user = JSON.parse(localStorage.getItem('speed_fit_user') || '{}');
    setCurrentUserId(user.id);
  };

  useEffect(() => {
    fetchClients();
  }, [activeTab]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchClients();
    };

    socket.on('client_updated', handleUpdate);
    socket.on('users_updated', handleUpdate);

    return () => {
      socket.off('client_updated', handleUpdate);
      socket.off('users_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
// ...
      try {
        const config = await store.getConfig();
        setIsCloudConnected(!!config.isConnected);
      } catch (e) {
        setIsCloudConnected(false);
      }
    };
    checkConnection();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <Overview clients={clients} />;
      case 'clients': return <ClientManagement clients={clients} setActiveTab={setActiveTab} />;
      case 'workouts': return <WorkoutEditor clients={clients} />;
      case 'diet': return <DietEditor clients={clients} />;
      case 'attendance': return <AttendanceManager clients={clients} />;
      case 'payments': return <PaymentManager clients={clients} />;
      case 'messages': return <Messages clients={clients} currentUserId={currentUserId} />;
      case 'setup': return <DatabaseSetup />;
      default: return <Overview clients={clients} />;
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar role={UserRole.TRAINER} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      
      <main className="flex-1 lg:ml-64 overflow-y-auto p-6 lg:p-10">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-16 lg:mt-0">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h2 className="text-3xl font-black text-black italic tracking-tighter brand-font uppercase">TRAINER <span className="text-red-600">CONSOLE</span></h2>
              <p className="text-neutral-500 text-sm mt-1">Manage your clients and their transformation journeys.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className={`bg-white border border-black/5 rounded-full px-4 py-2 flex items-center space-x-2 text-[10px] uppercase font-black tracking-widest ${isCloudConnected ? 'text-red-600' : 'text-orange-500'} shadow-sm`}>
                <div className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-red-600' : 'bg-orange-500'} animate-pulse`}></div>
                <span className="text-neutral-500">{isCloudConnected ? 'Cloud Sync Active' : 'Local Mode'}</span>
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default TrainerDashboard;
