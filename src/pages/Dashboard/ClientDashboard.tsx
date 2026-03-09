import React, { useEffect, useState } from 'react';
import { Activity, Target, Calendar, Zap, Shield, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { WorkoutLog } from '../../types';
import { Link } from 'react-router-dom';

interface Props {
  userData: any;
}

const ClientDashboard: React.FC<Props> = ({ userData }) => {
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const logs = await api.getWorkoutLogs();
        setRecentLogs(logs);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching client data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-2 h-2 bg-brand-red animate-pulse"></div>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red/80">BUILD TO TRANSFORMATION</p>
          </div>
          <h2 className="text-6xl font-display italic uppercase leading-tight text-white">
            Recruit <span className="text-brand-red">Dashboard</span>
          </h2>
          <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-4">
            Welcome back, {userData?.name || 'User'}. Systems synchronized.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Current Phase</p>
            <p className="text-xl font-mono text-white">PHASE 01: INITIALIZATION</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Current Role', value: userData?.role || 'CLIENT', icon: Shield, color: 'brand-red' },
          { label: 'Next Deployment', value: 'TOMORROW 09:00', icon: Calendar, color: 'brand-red' },
          { label: 'Active Objectives', value: '03', icon: Target, color: 'brand-red' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group hover:border-brand-red/50 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-full h-full" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-display italic leading-none uppercase">{stat.value}</p>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Recent Telemetry</h3>
          </div>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <div className="bg-neutral-900/30 border border-dashed border-neutral-800 p-20 rounded-[2.5rem] text-center">
                <Zap className="w-8 h-8 text-neutral-800 mx-auto mb-4" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No recent activity recorded in system logs.</p>
              </div>
            ) : (
              recentLogs.map(log => (
                <Link 
                  key={log.id} 
                  to="/workout-logs"
                  className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl hover:border-brand-red/50 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 bg-neutral-800 rounded-2xl flex items-center justify-center font-display italic text-xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
                      {new Date(log.date).getDate()}
                    </div>
                    <div>
                      <p className="font-bold text-white uppercase tracking-wider">Workout Log</p>
                      <p className="text-[10px] font-mono text-neutral-500 uppercase">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase">{log.entries.length} Exercises</p>
                    <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Target className="w-4 h-4 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider">Mission Intel</h3>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-[2rem]">
            <p className="text-[10px] font-mono text-neutral-500 uppercase leading-relaxed">
              Your training protocols are being finalized by your lead trainer. Stay tuned for deployment orders.
            </p>
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <button className="w-full py-3 bg-neutral-800 text-neutral-400 font-mono text-[10px] uppercase tracking-widest rounded-xl hover:bg-neutral-700 transition-colors">
                View Full Dossier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
