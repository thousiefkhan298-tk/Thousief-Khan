
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../../types';
import { store } from '../../../store';
import { socket } from '../../../socket';

const ClientManagement: React.FC<{ clients: User[], setActiveTab: (tab: string) => void }> = ({ clients = [], setActiveTab }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  const filteredClients = clients.filter(client => 
    (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNote = async () => {
    if (!noteInput.trim() || !selectedClientId) return;
    try {
      await store.saveTrainerNote({
        clientId: selectedClientId,
        note: noteInput
      });
      setNoteInput('');
      fetchData();
    } catch (error) {
      alert('Failed to save note');
    }
  };

  const fetchData = useCallback(async () => {
    if (!selectedClientId) return;
    // setLoading(true); // Optional: maybe don't show loading spinner for real-time updates to avoid flickering
    const data = await store.getClientData(selectedClientId);
    setSelectedData(data);
    // setLoading(false);
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedClientId) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    } else {
      setSelectedData(null);
    }
  }, [selectedClientId, fetchData]);

  useEffect(() => {
    const handleClientUpdate = (clientId: string) => {
      console.log('[ClientManagement] Received client_updated for:', clientId);
      if (selectedClientId === clientId) {
        console.log('[ClientManagement] Refreshing data for selected client');
        fetchData();
      }
    };

    socket.on('client_updated', handleClientUpdate);

    return () => {
      socket.off('client_updated', handleClientUpdate);
    };
  }, [selectedClientId, fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Client Directory</h3>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search clients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-full px-10 py-2 text-sm focus:border-lime-500 w-64 outline-none transition-all"
          />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-xs"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length > 0 ? filteredClients.map(client => (
          <div 
            key={client.id} 
            className={`bg-neutral-900 border ${selectedClientId === client.id ? 'border-lime-500' : 'border-neutral-800'} p-6 rounded-3xl hover:border-neutral-600 transition-all cursor-pointer group`}
            onClick={() => setSelectedClientId(client.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-xl text-neutral-600 group-hover:text-lime-500 transition-colors">
                  <i className="fas fa-user"></i>
                </div>
                {client.isOnline && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-lime-500 border-2 border-neutral-950 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${client.onboardingCompleted ? 'bg-lime-500/10 text-lime-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {client.onboardingCompleted ? 'Onboarded' : 'Incomplete'}
                </span>
                {client.lastActive && (
                  <span className="text-[8px] text-neutral-600 uppercase font-bold mt-1">
                    {client.isOnline ? 'Active Now' : `Last seen: ${new Date(client.lastActive).toLocaleDateString()}`}
                  </span>
                )}
              </div>
            </div>
            <h4 className="font-bold text-white mb-1">{client.name || 'Unnamed Client'}</h4>
            <p className="text-xs text-neutral-500 mb-4">{client.email}</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-neutral-800 rounded-xl text-[10px] font-black uppercase hover:bg-neutral-700 transition-colors">View Profile</button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center text-neutral-600 border border-dashed border-neutral-800 rounded-3xl">
            <p className="text-sm font-bold uppercase tracking-widest">No clients found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {selectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedClientId(null)}></div>
          <div className="relative w-full max-w-2xl h-full bg-neutral-950 p-10 overflow-y-auto animate-slide-in-right border-l border-neutral-800 shadow-2xl">
            <button 
              onClick={() => setSelectedClientId(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>

            <h2 className="text-3xl font-black italic brand-font mb-2">{selectedData.details?.fullName}</h2>
            <p className="text-lime-500 text-xs font-bold uppercase tracking-widest mb-6">Client Comprehensive Record</p>

            <div className="flex flex-wrap gap-2 mb-10">
              <button 
                onClick={() => { setSelectedClientId(null); setActiveTab('workouts'); }}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] font-black uppercase text-neutral-400 hover:border-lime-500 hover:text-lime-500 transition-all"
              >
                <i className="fas fa-dumbbell mr-2"></i> Edit Workout
              </button>
              <button 
                onClick={() => { setSelectedClientId(null); setActiveTab('diet'); }}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] font-black uppercase text-neutral-400 hover:border-lime-500 hover:text-lime-500 transition-all"
              >
                <i className="fas fa-utensils mr-2"></i> Edit Diet
              </button>
              <button 
                onClick={() => { setSelectedClientId(null); setActiveTab('payments'); }}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] font-black uppercase text-neutral-400 hover:border-lime-500 hover:text-lime-500 transition-all"
              >
                <i className="fas fa-receipt mr-2"></i> Manage Billing
              </button>
            </div>

            <div className="space-y-10 pb-20">
               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Age / Gender</label>
                      <p className="text-neutral-300 font-bold">{selectedData.details?.age} yrs / {selectedData.details?.gender}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Phone</label>
                      <p className="text-neutral-300 font-bold">{selectedData.details?.phoneNumber}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Emergency Contact</label>
                      <p className="text-neutral-300 font-bold">{selectedData.details?.emergencyContact}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Address</label>
                      <p className="text-neutral-300 font-bold">{selectedData.details?.address}</p>
                    </div>
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Trainer Notes (Private)</h4>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add a private note..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:border-lime-500 outline-none resize-none h-20"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteInput.trim()}
                        className="px-4 bg-lime-500 text-black rounded-xl font-bold hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {(selectedData.trainerNotes || []).slice().reverse().map((note: any) => (
                        <div key={note.id} className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                          <p className="text-xs text-neutral-300 whitespace-pre-wrap">{note.note}</p>
                          <p className="text-[9px] text-neutral-600 mt-2 text-right">{new Date(note.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                      {!(selectedData.trainerNotes || []).length && <p className="text-xs text-neutral-600 italic text-center py-4">No notes added yet.</p>}
                    </div>
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Health Assessment</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Conditions</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedData.health?.conditions?.map((c: string) => (
                          <span key={c} className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-neutral-900 p-3 rounded-xl">
                        <label className="text-[9px] text-neutral-500 uppercase font-black">Stress</label>
                        <p className="text-white font-bold">{selectedData.health?.stress}</p>
                      </div>
                      <div className="bg-neutral-900 p-3 rounded-xl">
                        <label className="text-[9px] text-neutral-500 uppercase font-black">Smoking</label>
                        <p className="text-white font-bold">{selectedData.health?.smoking ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="bg-neutral-900 p-3 rounded-xl">
                        <label className="text-[9px] text-neutral-500 uppercase font-black">Sleep</label>
                        <p className="text-white font-bold">{selectedData.health?.sleepHours}h</p>
                      </div>
                    </div>
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Physical Measurements</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['height', 'weight', 'waist', 'bloodPressure'].map(key => (
                       <div key={key} className="bg-neutral-900 p-4 rounded-xl text-center">
                          <p className="text-neutral-500 text-[8px] uppercase font-black mb-1">{key}</p>
                          <p className="text-white font-bold">{selectedData.health?.[key]}</p>
                       </div>
                    ))}
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Fitness Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-neutral-900 p-4 rounded-2xl">
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Pushups to Failure</label>
                      <p className="text-2xl font-black text-lime-500">{selectedData.fitness?.pushUps || '-'}</p>
                    </div>
                    <div className="bg-neutral-900 p-4 rounded-2xl">
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Step Test (BPM)</label>
                      <p className="text-2xl font-black text-lime-500">{selectedData.fitness?.stepTestBpm || '-'}</p>
                    </div>
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Current Plans</h4>
                  <div className="space-y-4">
                    <div className="bg-neutral-900 p-4 rounded-2xl">
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Workout Plan</label>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-3">{selectedData.workout?.plan || 'No plan assigned'}</p>
                    </div>
                    <div className="bg-neutral-900 p-4 rounded-2xl">
                      <label className="text-[10px] text-neutral-600 uppercase font-black">Diet Plan</label>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-3">{selectedData.diet?.plan || 'No plan assigned'}</p>
                    </div>
                  </div>
               </section>

                <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Workout History</h4>
                  <div className="space-y-4">
                    {(selectedData.workoutLogs || []).slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((log: any) => {
                      const isRecent = (Date.now() - new Date(log.date).getTime()) < 60000; // Less than 1 minute old
                      return (
                        <div key={log.id} className={`bg-neutral-900 p-4 rounded-xl transition-all duration-500 ${isRecent ? 'border border-lime-500 shadow-lg shadow-lime-500/20' : ''}`}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-neutral-300 font-bold">{new Date(log.date).toLocaleDateString()}</span>
                              {isRecent && <span className="bg-lime-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">NEW</span>}
                            </div>
                            <span className="text-[9px] text-neutral-500 uppercase">{new Date(log.date).toLocaleTimeString()}</span>
                          </div>
                          <div className="space-y-2">
                            {log.entries.map((entry: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-[10px] border-b border-neutral-800 pb-1 last:border-0">
                                <span className="text-white font-medium">{entry.exercise}</span>
                                <span className="text-neutral-400">{entry.sets} x {entry.reps} {entry.weight ? `@ ${entry.weight}kg` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {!(selectedData.workoutLogs || []).length && <p className="text-xs text-neutral-600 italic">No workout logs found.</p>}
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Recent Attendance</h4>
                  <div className="space-y-2">
                    {(selectedData.attendance || []).slice(-5).reverse().map((log: any) => (
                      <div key={log.id} className="flex justify-between items-center p-3 bg-neutral-900 rounded-xl">
                        <span className="text-xs text-neutral-300">{new Date(log.date).toLocaleDateString()}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${log.status === 'Present' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-500/10 text-red-500'}`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                    {!(selectedData.attendance || []).length && <p className="text-xs text-neutral-600 italic">No attendance records.</p>}
                  </div>
               </section>

               <section>
                  <h4 className="text-lime-500 font-bold uppercase text-xs tracking-wider mb-4 border-b border-lime-500/20 pb-2">Payment Status</h4>
                  <div className="space-y-2">
                    {(selectedData.payments || []).slice(-3).reverse().map((pay: any) => (
                      <div key={pay.id} className="flex justify-between items-center p-3 bg-neutral-900 rounded-xl">
                        <div>
                          <p className="text-xs text-neutral-300 font-bold">{pay.package}</p>
                          <p className="text-[9px] text-neutral-500">Due: {pay.dueDate}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${pay.status === 'Paid' ? 'bg-lime-500/10 text-lime-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {pay.status}
                        </span>
                      </div>
                    ))}
                    {!(selectedData.payments || []).length && <p className="text-xs text-neutral-600 italic">No payment history.</p>}
                  </div>
               </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
