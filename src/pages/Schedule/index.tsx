import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { firebaseService } from '../../services/firebaseService';
import { User, UpcomingSession } from '../../types';
import { Calendar, Clock, Plus, User as UserIcon, Check, AlertCircle } from 'lucide-react';

interface Props {
  user: any;
}

const Schedule: React.FC<Props> = ({ user }) => {
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    date: '',
    time: '',
    status: 'Pending'
  });

  const isTrainer = user.role === 'TRAINER';

  useEffect(() => {
    let unsubscribeSessions: () => void;
    
    if (isTrainer) {
      unsubscribeSessions = firebaseService.subscribeToAllSessions((data) => {
        setSessions(data as UpcomingSession[]);
      });
      
      firebaseService.getUsers().then(users => {
        setClients(users.filter(u => u.role === 'CLIENT'));
        setLoading(false);
      });
    } else {
      unsubscribeSessions = firebaseService.subscribeToUpcomingSessions(user.uid, (data) => {
        setSessions(data as UpcomingSession[]);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
    };
  }, [user.uid, isTrainer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateTime = `${formData.date}T${formData.time}`;
      await firebaseService.addSession({
        clientId: formData.clientId,
        date: dateTime,
        status: formData.status
      });
      setShowModal(false);
      setFormData({ clientId: '', date: '', time: '', status: 'Pending' });
    } catch (error) {
      console.error("Error adding session:", error);
      alert("Failed to schedule session.");
    }
  };

  const handleConfirm = async (session: UpcomingSession) => {
    try {
      await firebaseService.confirmSession(session.id, { status: 'Confirmed' });
      
      // Simulate sending a notification by adding a message or just a log
      console.log(`Notification sent to client ${session.clientId}: Session on ${new Date(session.date).toLocaleString()} confirmed.`);
      
      // Optional: Send an actual message in the system
      await firebaseService.sendMessage({
        senderId: user.uid,
        receiverId: session.clientId,
        content: `Session Confirmed: Your training session for ${new Date(session.date).toLocaleDateString()} at ${new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} has been approved. See you at the facility.`,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      alert("Session confirmed and client notified.");
    } catch (error) {
      console.error("Error confirming session:", error);
      alert("Failed to confirm session.");
    }
  };

  if (loading) {
    return (
      <Layout userData={user}>
        <div className="flex items-center justify-center h-full">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Loading Schedule...</p>
        </div>
      </Layout>
    );
  }

  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Layout userData={user}>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display italic uppercase tracking-wider text-white">Schedule</h1>
            <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-2">Manage your upcoming sessions</p>
          </div>
          {isTrainer && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Session
            </button>
          )}
        </div>

        <div className="grid gap-4">
          {sortedSessions.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 italic">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            sortedSessions.map(session => {
              const sessionDate = new Date(session.date);
              const client = clients.find(c => c.id === session.clientId);
              
              return (
                <div key={session.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-neutral-800 p-3 rounded-2xl">
                      <Calendar className="w-6 h-6 text-brand-red" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-bold text-lg">{sessionDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-widest ${
                          session.status === 'Confirmed' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-brand-red/10 text-brand-red border border-brand-red/20 animate-pulse'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-neutral-400 text-xs font-mono">
                          <Clock className="w-3 h-3 mr-1" />
                          {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isTrainer && client && (
                          <div className="flex items-center text-neutral-400 text-xs font-mono">
                            <UserIcon className="w-3 h-3 mr-1" />
                            {client.name || client.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isTrainer && session.status === 'Pending' && (
                    <button 
                      onClick={() => handleConfirm(session)} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest flex items-center space-x-2 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    >
                      <Check className="w-3 h-3" />
                      <span>Confirm Session</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl w-full max-w-md space-y-6">
            <div>
              <h3 className="text-2xl font-display italic uppercase text-white">Schedule Session</h3>
              <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-1">Book a new training slot</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">Client</label>
                <select 
                  className="input-field"
                  value={formData.clientId}
                  onChange={e => setFormData({...formData, clientId: e.target.value})}
                  required
                >
                  <option value="">Select Client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name || client.email}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">Date</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">Time</label>
                  <input 
                    type="time" 
                    className="input-field"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">Status</label>
                <select 
                  className="input-field"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Schedule</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default Schedule;
