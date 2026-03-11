import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../../services/firebaseService';
import { auth } from '../../firebase';
import Layout from '../../components/Layout';
import { WorkoutLog, User, FavoriteExercise } from '../../types';
import { Plus, Trash2, ChevronDown, Star, Search, ClipboardList, Zap, History } from 'lucide-react';
import { COMMON_EXERCISES } from '../../constants';

interface WorkoutLogsProps {
  user: any;
}

const WorkoutLogs: React.FC<WorkoutLogsProps> = ({ user }) => {
  const [userData, setUserData] = useState<any>(user);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(user.role === 'CLIENT' ? user.uid : '');
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([]);
  const [allLoggedExercises, setAllLoggedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState([{ exercise: '', sets: '', reps: '', weight: '' }]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (userData.role === 'TRAINER') {
          const clientsData = await firebaseService.getUsers();
          setClients(clientsData.filter(u => u.role === 'CLIENT'));
          if (clientsData.filter(u => u.role === 'CLIENT').length > 0 && !selectedClientId) {
            setSelectedClientId(clientsData.filter(u => u.role === 'CLIENT')[0].id);
          }

          const favsData = await firebaseService.getFavorites(userData.uid);
          setFavorites(favsData);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;

    const unsubscribe = firebaseService.subscribeToWorkoutLogs((logsData) => {
      setLogs(logsData);
    }, selectedClientId);

    return () => unsubscribe();
  }, [selectedClientId]);

  const handleAddEntry = () => {
    setEntries([...entries, { exercise: '', sets: '', reps: '', weight: '' }]);
  };

  const handleEntryChange = (index: number, field: string, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleRemoveEntry = (index: number) => {
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
  };

  const handleToggleFavorite = async (index: number) => {
    const entry = entries[index];
    if (!entry.exercise.trim()) return;

    try {
      await firebaseService.toggleFavorite(userData.uid, {
        name: entry.exercise.trim(),
        defaultSets: entry.sets,
        defaultReps: entry.reps
      });

      // Refresh favorites
      const favsData = await firebaseService.getFavorites(userData.uid);
      setFavorites(favsData);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleSelectFavorite = (index: number, exerciseName: string, sets?: string, reps?: string) => {
    const newEntries = [...entries];
    newEntries[index] = {
      ...newEntries[index],
      exercise: exerciseName,
      sets: sets || newEntries[index].sets,
      reps: reps || newEntries[index].reps
    };
    setEntries(newEntries);
    setDropdownIndex(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !date) return;

    try {
      const newLog = {
        clientId: selectedClientId,
        date,
        entries: entries.filter(e => e.exercise.trim() !== ''),
        notes
      };

      await firebaseService.saveWorkoutLog(newLog);
      
      // Reset form
      setShowForm(false);
      setDate('');
      setNotes('');
      setEntries([{ exercise: '', sets: '', reps: '', weight: '' }]);
    } catch (error) {
      console.error("Error adding workout log:", error);
      alert("Failed to save workout log.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      await firebaseService.deleteWorkoutLog(id);
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  if (loading) {
    return (
      <Layout userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Accessing Archives...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userData={userData}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <ClipboardList className="w-4 h-4 text-brand-red" />
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red">Session Telemetry</p>
          </div>
          <h2 className="text-6xl font-display italic uppercase leading-none">
            Workout <span className="text-brand-red">Logs</span>
          </h2>
          <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-4">
            Track and manage recruit training performance.
          </p>
        </div>
        {userData?.role === 'TRAINER' && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn-primary group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>{showForm ? 'Abort Entry' : 'Initialize Log'}</span>
          </button>
        )}
      </div>

      {userData?.role === 'TRAINER' && (
        <div className="mb-10 bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800 inline-block">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3 ml-1">Select Recruit</label>
          <div className="relative">
            <select 
              value={selectedClientId} 
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="appearance-none bg-neutral-800 border border-neutral-700 text-white font-mono text-[10px] uppercase tracking-widest rounded-2xl block w-full p-4 pr-12 focus:ring-2 focus:ring-brand-red outline-none transition-all"
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name || client.email}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          </div>
        </div>
      )}

      {showForm && userData?.role === 'TRAINER' && (
        <div className="bg-neutral-900/50 p-8 rounded-[2.5rem] border border-neutral-800 mb-12 shadow-2xl">
          <div className="mb-8">
            <h3 className="text-2xl font-display italic uppercase tracking-wider mb-2">Initialize <span className="text-brand-red">Log</span></h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Manual Data Entry Protocol</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="max-w-xs">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3 ml-1">Timestamp (Date)</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="space-y-6" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Exercise Sequence</label>
                <button 
                  type="button" 
                  onClick={handleAddEntry}
                  className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-brand-red hover:text-red-400 transition-colors ml-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Exercise Module</span>
                </button>
              </div>
              
              {entries.map((entry, index) => {
                const isFavorite = favorites.some(f => f.name.toLowerCase() === entry.exercise.trim().toLowerCase() && entry.exercise.trim() !== '');
                
                // Autocomplete logic
                const searchTerm = entry.exercise.toLowerCase();
                
                // 1. Filter Favorites
                const filteredFavorites = favorites.filter(f => f.name.toLowerCase().includes(searchTerm));
                
                // 2. Filter Previously Logged (excluding favorites)
                const filteredLogged = allLoggedExercises.filter(ex => 
                  ex.toLowerCase().includes(searchTerm) && 
                  !favorites.some(f => f.name.toLowerCase() === ex.toLowerCase())
                );
                
                // 3. Filter Predefined (excluding favorites and logged)
                const filteredPredefined = COMMON_EXERCISES.filter(ex => 
                  ex.toLowerCase().includes(searchTerm) && 
                  !favorites.some(f => f.name.toLowerCase() === ex.toLowerCase()) &&
                  !allLoggedExercises.some(le => le.toLowerCase() === ex.toLowerCase())
                );

                const hasSuggestions = filteredFavorites.length > 0 || filteredLogged.length > 0 || filteredPredefined.length > 0;

                return (
                <div key={index} className="flex flex-wrap lg:flex-nowrap gap-4 items-start bg-neutral-800/20 p-6 rounded-3xl border border-neutral-800/50">
                  <div className="flex-1 min-w-[280px] relative">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input 
                        type="text" 
                        placeholder="Search or type exercise..." 
                        required
                        value={entry.exercise}
                        onChange={(e) => {
                          handleEntryChange(index, 'exercise', e.target.value);
                          setDropdownIndex(index);
                        }}
                        onFocus={() => setDropdownIndex(index)}
                        className="input-field pl-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(index)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${isFavorite ? 'text-brand-red' : 'text-neutral-700 hover:text-brand-red'}`}
                        title={isFavorite ? "Remove from favorites" : "Save as favorite"}
                      >
                        <Star className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                    
                    {/* Autocomplete Dropdown */}
                    {dropdownIndex === index && hasSuggestions && (
                      <div className="absolute z-30 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                        {/* Favorites Section */}
                        {filteredFavorites.length > 0 && (
                          <div className="p-2">
                            <p className="px-4 py-2 text-[8px] font-mono text-brand-red uppercase tracking-widest border-b border-neutral-700/30 mb-1 flex items-center">
                              <Star className="w-2 h-2 mr-2" fill="currentColor" /> Favorites
                            </p>
                            {filteredFavorites.map(fav => (
                              <div
                                key={fav.id}
                                className="px-6 py-3 hover:bg-neutral-700 cursor-pointer flex justify-between items-center rounded-xl transition-colors"
                                onClick={() => handleSelectFavorite(index, fav.name, fav.defaultSets, fav.defaultReps)}
                              >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white">{fav.name}</span>
                                <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">{fav.defaultSets} × {fav.defaultReps}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Previously Logged Section */}
                        {filteredLogged.length > 0 && (
                          <div className="p-2 border-t border-neutral-700/30">
                            <p className="px-4 py-2 text-[8px] font-mono text-neutral-500 uppercase tracking-widest border-b border-neutral-700/30 mb-1 flex items-center">
                              <History className="w-2 h-2 mr-2" /> Previous Intel
                            </p>
                            {filteredLogged.map(ex => (
                              <div
                                key={ex}
                                className="px-6 py-3 hover:bg-neutral-700 cursor-pointer flex justify-between items-center rounded-xl transition-colors"
                                onClick={() => handleSelectFavorite(index, ex)}
                              >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">{ex}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Predefined Section */}
                        {filteredPredefined.length > 0 && (
                          <div className="p-2 border-t border-neutral-700/30">
                            <p className="px-4 py-2 text-[8px] font-mono text-neutral-500 uppercase tracking-widest border-b border-neutral-700/30 mb-1 flex items-center">
                              <Zap className="w-2 h-2 mr-2" /> Standard Protocol
                            </p>
                            {filteredPredefined.map(ex => (
                              <div
                                key={ex}
                                className="px-6 py-3 hover:bg-neutral-700 cursor-pointer flex justify-between items-center rounded-xl transition-colors"
                                onClick={() => handleSelectFavorite(index, ex)}
                              >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{ex}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-full sm:w-24">
                    <input 
                      type="text" 
                      placeholder="Sets" 
                      value={entry.sets}
                      onChange={(e) => handleEntryChange(index, 'sets', e.target.value)}
                      className="input-field text-center"
                    />
                  </div>
                  <div className="w-full sm:w-24">
                    <input 
                      type="text" 
                      placeholder="Reps" 
                      value={entry.reps}
                      onChange={(e) => handleEntryChange(index, 'reps', e.target.value)}
                      className="input-field text-center"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <input 
                      type="text" 
                      placeholder="Weight (kg)" 
                      value={entry.weight}
                      onChange={(e) => handleEntryChange(index, 'weight', e.target.value)}
                      className="input-field text-center"
                    />
                  </div>
                  {entries.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveEntry(index)}
                      className="p-4 text-neutral-600 hover:text-brand-red transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )})}
              <button 
                type="button" 
                onClick={handleAddEntry}
                className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-brand-red hover:text-red-400 transition-colors ml-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Exercise Module</span>
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3 ml-1">Session Intel (Notes)</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input-field"
                placeholder="Record session observations..."
              ></textarea>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-neutral-800">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all"
              >
                Abort
              </button>
              <button 
                type="submit" 
                className="bg-white text-black px-10 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
              >
                Commit Log
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        <AnimatePresence>
          {logs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-neutral-900/30 rounded-[2.5rem] border border-dashed border-neutral-800 p-20 text-center"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 italic">No telemetry data found for this recruit.</p>
            </motion.div>
          ) : (
            logs.map(log => (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-neutral-900/50 rounded-[2.5rem] border border-neutral-800 overflow-hidden shadow-xl group hover:border-neutral-700 transition-colors"
              >
                <div className="bg-neutral-800/30 px-8 py-6 border-b border-neutral-800 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <Zap className="w-4 h-4 text-brand-red" />
                    <h3 className="font-display italic text-xl uppercase tracking-wider text-white">
                      {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                  </div>
                  {userData?.role === 'TRAINER' && (
                    <button 
                      onClick={() => handleDelete(log.id)}
                      className="text-neutral-600 hover:text-brand-red transition-colors p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="p-8">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-neutral-800">
                          <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Exercise Module</th>
                          <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 text-center">Sets</th>
                          <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 text-center">Reps</th>
                          <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500 text-center">Load (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50">
                        {log.entries.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-neutral-800/20 transition-colors">
                            <td className="px-4 py-5 font-mono text-[10px] uppercase tracking-widest text-white">{entry.exercise}</td>
                            <td className="px-4 py-5 font-mono text-[10px] text-neutral-400 text-center">{entry.sets || '-'}</td>
                            <td className="px-4 py-5 font-mono text-[10px] text-neutral-400 text-center">{entry.reps || '-'}</td>
                            <td className="px-4 py-5 font-mono text-[10px] text-brand-red font-bold text-center">{entry.weight ? `${entry.weight}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {log.notes && (
                    <div className="mt-8 pt-8 border-t border-neutral-800">
                      <p className="text-[8px] font-mono text-neutral-600 uppercase tracking-[0.3em] mb-3">Trainer Observation</p>
                      <div className="bg-neutral-900/80 p-6 rounded-2xl border border-neutral-800/50 font-mono text-[10px] text-neutral-400 leading-relaxed uppercase tracking-wider">
                        {log.notes}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default WorkoutLogs;
