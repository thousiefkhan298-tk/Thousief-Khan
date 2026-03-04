
import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { store } from '../../../store';
import { socket } from '../../../socket';

const AttendanceManager: React.FC<{ clients: User[] }> = ({ clients = [] }) => {
  const [activeClient, setActiveClient] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'attendance' | 'requests'>('attendance');
  
  useEffect(() => {
    const fetchRequests = async () => {
      const data = await store.getSessionRequests();
      setRequests(data);
    };
    fetchRequests();

    const handleUpdate = (req: any) => {
      setRequests(prev => {
        const idx = prev.findIndex(r => r.id === req.id);
        if (idx > -1) {
          const newReqs = [...prev];
          newReqs[idx] = req;
          return newReqs;
        }
        return [req, ...prev];
      });
    };
    socket.on('session_request_updated', handleUpdate);
    return () => { socket.off('session_request_updated', handleUpdate); };
  }, []);

  const handleMark = async (status: 'Present' | 'Missed') => {
    if (activeClient) {
      await store.addAttendance(activeClient, status);
      const updatedData = await store.getClientData(activeClient);
      setLogs(updatedData.attendance);
      // alert(`Marked as ${status} for today.`);
    }
  };

  const handleSelectClient = async (id: string) => {
    setActiveClient(id);
    const data = await store.getClientData(id);
    setLogs(data.attendance);
    setViewMode('attendance');
  };

  const handleRequestAction = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await store.updateSessionRequest(id, { status });
    } catch (error) {
      alert('Failed to update request');
    }
  };

  const validRequests = Array.isArray(requests) ? requests : [];
  const pendingRequests = validRequests.filter(r => r.status === 'Pending');
  const pastRequests = validRequests.filter(r => r.status !== 'Pending');

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <div className="w-full lg:w-1/4 flex flex-col gap-6 h-full">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex-shrink-0">
          <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4">Overview</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode('attendance')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${viewMode === 'attendance' ? 'bg-lime-500 text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            >
              Attendance
            </button>
            <button 
              onClick={() => setViewMode('requests')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all relative ${viewMode === 'requests' ? 'bg-lime-500 text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            >
              Requests
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] border-2 border-neutral-900">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl overflow-hidden flex flex-col">
          <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4">Clients</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectClient(c.id)}
                className={`w-full p-4 rounded-xl text-left border transition-all group ${activeClient === c.id ? 'bg-lime-500/10 border-lime-500' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'}`}
              >
                <div className={`text-sm font-bold truncate ${activeClient === c.id ? 'text-lime-500' : 'text-neutral-300 group-hover:text-white'}`}>{c.name || c.email}</div>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${c.isOnline ? 'bg-lime-500' : 'bg-neutral-600'}`}></div>
                   <span className="text-[10px] text-neutral-500 uppercase font-bold">{c.isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-xl overflow-hidden flex flex-col h-full">
        {viewMode === 'attendance' ? (
          activeClient ? (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <i className="fas fa-calendar-check text-lime-500"></i>
                  Daily Attendance
                </h3>
                <span className="text-xs font-black uppercase text-neutral-500 bg-neutral-800 px-3 py-1 rounded-full">
                  {clients.find(c => c.id === activeClient)?.name || 'Client'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => handleMark('Present')}
                  className="py-6 bg-lime-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-lime-400 transition-all flex flex-col items-center justify-center gap-2 shadow-lg shadow-lime-500/20 group"
                >
                  <i className="fas fa-check-circle text-2xl group-hover:scale-110 transition-transform"></i>
                  <span>Mark Present</span>
                </button>
                <button 
                  onClick={() => handleMark('Missed')}
                  className="py-6 bg-neutral-800 text-red-500 font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-700 transition-all flex flex-col items-center justify-center gap-2 border border-neutral-700 group"
                >
                  <i className="fas fa-times-circle text-2xl group-hover:scale-110 transition-transform"></i>
                  <span>Mark Missed</span>
                </button>
              </div>

              <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4">Recent Logs</h4>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {(logs || []).length ? (logs || []).slice().reverse().map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.status === 'Present' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-500/10 text-red-500'}`}>
                          <i className={`fas ${log.status === 'Present' ? 'fa-check' : 'fa-times'}`}></i>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          <p className="text-[10px] text-neutral-500 uppercase font-black">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${log.status === 'Present' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-500/10 text-red-500'}`}>
                        {log.status}
                      </span>
                  </div>
                )) : (
                  <div className="text-center py-20 text-neutral-600 border border-dashed border-neutral-800 rounded-2xl">
                    <p className="text-sm font-bold uppercase tracking-widest">No attendance records found.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600">
              <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-6 animate-pulse">
                <i className="fas fa-user-check text-3xl text-neutral-500"></i>
              </div>
              <p className="font-bold uppercase tracking-widest text-sm">Select a client to manage attendance</p>
            </div>
          )
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <i className="fas fa-clock text-lime-500"></i>
                Reschedule Requests
              </h3>
              <span className="text-xs font-black uppercase text-neutral-500 bg-neutral-800 px-3 py-1 rounded-full">
                {pendingRequests.length} Pending
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {pendingRequests.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i> Action Required
                  </h4>
                  <div className="space-y-4">
                    {pendingRequests.map(req => {
                      const client = clients.find(c => c.id === req.clientId);
                      return (
                        <div key={req.id} className="bg-neutral-800/50 p-6 rounded-2xl border border-yellow-500/20 shadow-lg shadow-yellow-500/5">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-white">{client?.name || 'Unknown Client'}</span>
                                <span className="px-2 py-0.5 bg-neutral-700 rounded text-[10px] text-neutral-400 uppercase font-bold">Client</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-3">
                                <div>
                                  <p className="text-[10px] text-neutral-500 uppercase font-black">Missed Session</p>
                                  <p className="text-red-400 font-medium">{new Date(req.originalDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-neutral-500 uppercase font-black">Requested New Time</p>
                                  <p className="text-lime-500 font-bold">{new Date(req.requestedDate).toLocaleString()}</p>
                                </div>
                              </div>
                              {req.notes && (
                                <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                                  <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">Client Note</p>
                                  <p className="text-xs text-neutral-300 italic">"{req.notes}"</p>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                              <button 
                                onClick={() => handleRequestAction(req.id, 'Approved')}
                                className="px-4 py-3 bg-lime-500 text-black text-xs font-black uppercase tracking-wider rounded-xl hover:bg-lime-400 transition-colors flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-check"></i> Approve
                              </button>
                              <button 
                                onClick={() => handleRequestAction(req.id, 'Rejected')}
                                className="px-4 py-3 bg-neutral-900 text-red-500 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-950 border border-neutral-800 transition-colors flex items-center justify-center gap-2"
                              >
                                <i className="fas fa-times"></i> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4">History</h4>
                <div className="space-y-3">
                  {pastRequests.length > 0 ? pastRequests.slice().reverse().map(req => {
                    const client = clients.find(c => c.id === req.clientId);
                    return (
                      <div key={req.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                        <div>
                          <p className="text-sm font-bold text-neutral-300">{client?.name || 'Unknown'}</p>
                          <p className="text-xs text-neutral-500">
                            {new Date(req.originalDate).toLocaleDateString()} <i className="fas fa-arrow-right mx-1 text-[10px]"></i> {new Date(req.requestedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          req.status === 'Approved' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-10 text-neutral-600 border border-dashed border-neutral-800 rounded-2xl">
                      <p className="text-sm font-bold uppercase tracking-widest">No request history.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceManager;
