import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../../services/firebaseService.js';
import { auth } from '../../firebase.js';
import Layout from '../../components/Layout.js';
import { WorkoutLog, User, FavoriteExercise, ScheduledWorkout } from '../../types.js';
import { Plus, Trash2, ChevronDown, Star, Search, ClipboardList, Zap, History, Calendar, Play, Video } from 'lucide-react';
import { COMMON_EXERCISES } from '../../constants';
import ExerciseAnimation from '../../components/ExerciseAnimation.js';
import VisualWorkoutModal from '../../components/VisualWorkoutModal.js';

interface WorkoutLogsProps {
  user: any;
}

const WorkoutLogs: React.FC<WorkoutLogsProps> = ({ user }) => {
  const [userData, setUserData] = useState<any>(user);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(user.role === 'CLIENT' ? user.uid : '');
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([]);
  const [allLoggedExercises, setAllLoggedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'SCHEDULED'>(user.role === 'TRAINER' ? 'SCHEDULED' : 'LOGS');
  const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<{ exercise: string; sets: string; reps: string; weight: string; videoUrl?: string }[]>([{ exercise: '', sets: '', reps: '', weight: '' }]);

  // Visual Workout State
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [currentWorkoutTitle, setCurrentWorkoutTitle] = useState('');
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState<{ exercise: string; videoUrl?: string; sets?: string; reps?: string }[]>([]);
  const [currentWorkoutContent, setCurrentWorkoutContent] = useState('');

  const startVisualWorkout = (title: string, exercises: { exercise: string; videoUrl?: string; sets?: string; reps?: string }[], notes: string) => {
    setCurrentWorkoutTitle(title);
    setCurrentWorkoutExercises(exercises);
    setCurrentWorkoutContent(notes || 'Follow standard form.');
    setIsWorkoutModalOpen(true);
  };

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

    const unsubscribeLogs = firebaseService.subscribeToWorkoutLogs((logsData) => {
      setLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, selectedClientId);

    const unsubscribeScheduled = firebaseService.subscribeToScheduledWorkouts(selectedClientId, (scheduledData) => {
      setScheduledWorkouts(scheduledData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });

    return () => {
      unsubscribeLogs();
      unsubscribeScheduled();
    };
  }, [selectedClientId]);

  const handleAddEntry = () => {
    setEntries([...entries, { exercise: '', sets: '', reps: '', weight: '', videoUrl: '' }]);
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

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const workingUrl = url.trim();
      
      // Check for already embed format
      if (workingUrl.includes('youtube.com/embed/') || workingUrl.includes('player.vimeo.com/video/')) {
        return workingUrl;
      }

      // YouTube Regular Expression
      const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
      const match = workingUrl.match(ytRegex);
      if (match && match[1]) {
        let embedUrl = `https://www.youtube.com/embed/${match[1]}`;
        
        // Handle timestamps
        try {
          const urlObj = new URL(workingUrl.startsWith('http') ? workingUrl : `https://${workingUrl}`);
          const t = urlObj.searchParams.get('t');
          if (t) {
            const secondsMatch = t.match(/(\d+)s/);
            const minutesMatch = t.match(/(\d+)m/);
            let totalSeconds = 0;
            if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
            if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
            if (!minutesMatch && !secondsMatch && /^\d+$/.test(t)) totalSeconds = parseInt(t);
            if (totalSeconds > 0) embedUrl += `?start=${totalSeconds}`;
          }
        } catch (e) {
          // Ignore URL parsing errors and return basic embed
        }
        return embedUrl;
      }
      
      // Vimeo Regular Expression
      const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
      const vMatch = workingUrl.match(vimeoRegex);
      if (vMatch && vMatch[1]) {
        return `https://player.vimeo.com/video/${vMatch[1]}`;
      }
      
      // If it looks like a YouTube ID but not matched (11 chars)
      if (/^[a-zA-Z0-9_-]{11}$/.test(workingUrl)) {
        return `https://www.youtube.com/embed/${workingUrl}`;
      }

      return workingUrl;
    } catch (e) {
      return url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !date) return;

    try {
      if (isScheduling) {
        const newScheduled: any = {
          clientId: selectedClientId,
          date,
          entries: entries.filter(e => e.exercise.trim() !== ''),
          notes,
          status: 'SCHEDULED'
        };
        if (editingId) newScheduled.id = editingId;
        await firebaseService.saveScheduledWorkout(newScheduled);
      } else {
        const newLog: any = {
          clientId: selectedClientId,
          date,
          entries: entries.filter(e => e.exercise.trim() !== ''),
          notes
        };
        if (editingId) newLog.id = editingId;
        await firebaseService.saveWorkoutLog(newLog);
      }
      
      // Reset form
      setShowForm(false);
      setIsScheduling(false);
      setEditingId(null);
      setDate('');
      setNotes('');
      setEntries([{ exercise: '', sets: '', reps: '', weight: '' }]);
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("Failed to save workout.");
    }
  };

  const handleDelete = async (id: string, type: 'LOG' | 'SCHEDULED') => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      if (type === 'LOG') {
        await firebaseService.deleteWorkoutLog(id);
      } else {
        await firebaseService.deleteScheduledWorkout(id);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  if (loading) {
    return (
      <Layout userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white font-bold">Accessing Archives...</p>
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
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-brand-red">Workout History</p>
          </div>
          <h2 className="text-6xl font-display italic uppercase leading-none">
            Workout <span className="text-brand-red">Logs</span>
          </h2>
          <p className="text-white font-bold font-mono text-[10px] uppercase tracking-widest mt-4">
            Track and manage training performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => {
              setShowForm(!showForm);
              setIsScheduling(false);
              setEditingId(null);
              setEntries([{ exercise: '', sets: '', reps: '', weight: '' }]);
              setDate('');
              setNotes('');
            }}
            className="btn-secondary group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>{showForm && !isScheduling ? 'Cancel' : 'Log Workout'}</span>
          </button>
          {userData?.role === 'TRAINER' && (
            <button 
              onClick={() => {
                setShowForm(!showForm);
                setIsScheduling(true);
                setEditingId(null);
                setEntries([{ exercise: '', sets: '', reps: '', weight: '' }]);
                setDate('');
                setNotes('');
              }}
              className="btn-primary group"
            >
              <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{showForm && isScheduling ? 'Cancel' : 'Schedule Workout'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 mb-10 border-b border-neutral-700">
        <button 
          onClick={() => setActiveTab('SCHEDULED')}
          className={`pb-4 font-mono text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'SCHEDULED' ? 'text-white' : 'text-white font-bold hover:text-white font-bold'}`}
        >
          Scheduled Workouts
          {activeTab === 'SCHEDULED' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-red" />}
        </button>
        <button 
          onClick={() => setActiveTab('LOGS')}
          className={`pb-4 font-mono text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'LOGS' ? 'text-white' : 'text-white font-bold hover:text-white font-bold'}`}
        >
          Workout History
          {activeTab === 'LOGS' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-red" />}
        </button>
      </div>

      {userData?.role === 'TRAINER' && (
        <div className="mb-10 bg-neutral-800/50 p-6 rounded-3xl border border-neutral-700 inline-block">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-3 ml-1">Select Client</label>
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
            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white font-bold pointer-events-none" />
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-neutral-800/50 p-8 rounded-[2.5rem] border border-neutral-700 mb-12 shadow-2xl">
          <div className="mb-8">
            <h3 className="text-2xl font-display italic uppercase tracking-wider mb-2">
              {editingId ? 'Edit' : (isScheduling ? 'Schedule' : 'Log')} <span className="text-brand-red">Workout</span>
            </h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white font-bold">
              {editingId ? 'Updating existing record' : (isScheduling ? 'Assign future workout' : 'Manual Data Entry')}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="max-w-xs">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-3 ml-1">Date</label>
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
                <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Exercises</label>
                <button 
                  type="button" 
                  onClick={handleAddEntry}
                  className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-brand-red hover:text-red-400 transition-colors ml-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Exercise</span>
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
                <div key={index} className="flex flex-col gap-4 bg-neutral-800/20 p-6 rounded-3xl border border-neutral-700/50 relative group">
                  <div className="flex flex-wrap lg:flex-nowrap gap-4 items-start w-full">
                  <div className="flex-1 min-w-[280px] relative">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-50 font-bold" />
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
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${isFavorite ? 'text-brand-red' : 'text-white font-bold font-bold hover:text-brand-red'}`}
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
                                <span className="text-[8px] font-mono text-white font-bold uppercase tracking-widest">{fav.defaultSets} × {fav.defaultReps}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Previously Logged Section */}
                        {filteredLogged.length > 0 && (
                          <div className="p-2 border-t border-neutral-700/30">
                            <p className="px-4 py-2 text-[8px] font-mono text-white font-bold uppercase tracking-widest border-b border-neutral-700/30 mb-1 flex items-center">
                              <History className="w-2 h-2 mr-2" /> Previous Workouts
                            </p>
                            {filteredLogged.map(ex => (
                              <div
                                key={ex}
                                className="px-6 py-3 hover:bg-neutral-700 cursor-pointer flex justify-between items-center rounded-xl transition-colors"
                                onClick={() => handleSelectFavorite(index, ex)}
                              >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold">{ex}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Predefined Section */}
                        {filteredPredefined.length > 0 && (
                          <div className="p-2 border-t border-neutral-700/30">
                            <p className="px-4 py-2 text-[8px] font-mono text-white font-bold uppercase tracking-widest border-b border-neutral-700/30 mb-1 flex items-center">
                              <Zap className="w-2 h-2 mr-2" /> Standard Exercises
                            </p>
                            {filteredPredefined.map(ex => (
                              <div
                                key={ex}
                                className="px-6 py-3 hover:bg-neutral-700 cursor-pointer flex justify-between items-center rounded-xl transition-colors"
                                onClick={() => handleSelectFavorite(index, ex)}
                              >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white font-bold">{ex}</span>
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
                      className="p-4 text-neutral-50 font-bold hover:text-brand-red transition-colors absolute lg:static top-2 right-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  </div>
                  <div className="flex items-center space-x-3 bg-neutral-800/30 p-2 rounded-xl border border-neutral-700/30">
                    <Video className="w-4 h-4 text-neutral-400 ml-2" />
                    <input 
                      type="text"
                      placeholder="Attach Exercise Video URL (Optional)" 
                      value={entry.videoUrl || ''}
                      onChange={(e) => handleEntryChange(index, 'videoUrl', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-neutral-500 outline-none"
                    />
                  </div>
                </div>
              )})}
              <button 
                type="button" 
                onClick={handleAddEntry}
                className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-brand-red hover:text-red-400 transition-colors ml-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Exercise</span>
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-3 ml-1">Session Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input-field"
                placeholder="Record session observations..."
              ></textarea>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-neutral-700">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    setIsScheduling(false);
                    setEditingId(null);
                  }}
                  className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-white text-black px-10 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  {editingId ? 'Update Workout' : (isScheduling ? 'Schedule Workout' : 'Save Log')}
                </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'LOGS' ? (
            <motion.div 
              key="logs-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {logs.length === 0 ? (
                <div className="bg-neutral-800/30 rounded-[2.5rem] border border-dashed border-neutral-700 p-20 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No workout data found for this client.</p>
                </div>
              ) : (
                logs.map(log => (
                  <div 
                    key={log.id} 
                    className="bg-neutral-800/50 rounded-[2.5rem] border border-neutral-700 overflow-hidden shadow-xl group hover:border-neutral-700 transition-colors"
                  >
                    <div className="bg-neutral-800/30 px-8 py-6 border-b border-neutral-700 flex justify-between items-center cursor-pointer" onClick={() => toggleLogExpansion(log.id)}>
                      <div className="flex items-center space-x-4">
                        <Zap className="w-4 h-4 text-brand-red" />
                          <h3 className="font-display italic text-xl uppercase tracking-wider text-white">
                            {(() => {
                              try {
                                const d = new Date(log.date);
                                if (isNaN(d.getTime())) return 'Unspecified Date';
                                return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                              } catch (e) {
                                return 'Unspecified Date';
                              }
                            })()}
                          </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {log.entries.length > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              startVisualWorkout(`Log: ${new Date(log.date).toLocaleDateString()}`, log.entries.map(e => ({ exercise: e.exercise, videoUrl: e.videoUrl, sets: e.sets, reps: e.reps })), log.notes || '');
                            }}
                            className="flex items-center space-x-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg transition-colors mr-2"
                          >
                            <Play className="w-3 h-3" />
                            <span className="text-[8px] font-mono uppercase tracking-widest">Start Visual Workout</span>
                          </button>
                        )}
                        {userData?.role === 'TRAINER' && (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(log.id);
                                setIsScheduling(false);
                                setDate(log.date);
                                setEntries(log.entries.map(e => ({ 
                                  exercise: e.exercise, 
                                  sets: e.sets || '', 
                                  reps: e.reps || '', 
                                  weight: e.weight || '',
                                  videoUrl: e.videoUrl || ''
                                })));
                                setNotes(log.notes || '');
                                setShowForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-neutral-400 font-bold hover:text-emerald-500 transition-colors p-2"
                              title="Edit Log"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(log.id, 'LOG');
                              }}
                              className="text-neutral-50 font-bold hover:text-brand-red transition-colors p-2"
                              title="Delete Log"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        <button className="p-2 text-white transition-transform">
                          {expandedLogs[log.id] ? <ChevronDown className="w-5 h-5 rotate-180" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    {expandedLogs[log.id] && (
                      <div className="p-8 animate-fade-in">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-neutral-700">
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold">Exercise</th>
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold text-center">Sets</th>
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold text-center">Reps</th>
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold text-center">Load (kg)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                              {log.entries.map((entry, idx) => (
                                <React.Fragment key={idx}>
                                  <tr className="hover:bg-neutral-800/20 transition-colors">
                                    <td className="px-4 py-5 font-mono text-[10px] uppercase tracking-widest text-white flex items-center space-x-3">
                                      <ExerciseAnimation exerciseName={entry.exercise} className="w-8 h-8" minimal />
                                      <span>{entry.exercise}</span>
                                    </td>
                                    <td className="px-4 py-5 font-mono text-[10px] text-neutral-50 font-bold text-center">{entry.sets || '-'}</td>
                                    <td className="px-4 py-5 font-mono text-[10px] text-neutral-50 font-bold text-center">{entry.reps || '-'}</td>
                                    <td className="px-4 py-5 font-mono text-[10px] text-brand-red font-bold text-center">{entry.weight ? `${entry.weight}` : '-'}</td>
                                  </tr>
                                  {entry.videoUrl && (
                                    <tr>
                                      <td colSpan={4} className="px-4 pb-8">
                                        <div className="aspect-video w-full max-w-lg mx-auto rounded-xl overflow-hidden bg-black border border-neutral-700 shadow-lg mt-2">
                                          {entry.videoUrl.includes('youtube') || entry.videoUrl.includes('youtu.be') || entry.videoUrl.includes('vimeo') ? (
                                            <iframe
                                              key={`log-${entry.videoUrl}`}
                                              src={getEmbedUrl(entry.videoUrl)}
                                              className="w-full h-full"
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                              loading="lazy"
                                              title="Exercise Video"
                                            ></iframe>
                                          ) : (
                                            <video 
                                              src={entry.videoUrl} 
                                              className="w-full h-full object-cover" 
                                              controls 
                                            />
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {log.notes && (
                          <div className="mt-8 pt-8 border-t border-neutral-700">
                            <p className="text-[8px] font-mono text-neutral-50 font-bold uppercase tracking-[0.3em] mb-3">Trainer Observation</p>
                            <div className="bg-neutral-800/80 p-6 rounded-2xl border border-neutral-700/50 font-mono text-[10px] text-neutral-50 font-bold leading-relaxed uppercase tracking-wider">
                              {log.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="scheduled-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {scheduledWorkouts.length === 0 ? (
                <div className="bg-neutral-800/30 rounded-[2.5rem] border border-dashed border-neutral-700 p-20 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-50 font-bold italic">No future workouts scheduled.</p>
                </div>
              ) : (
                scheduledWorkouts.map(workout => (
                  <div 
                    key={workout.id} 
                    className="bg-neutral-800/50 rounded-[2.5rem] border border-neutral-700 overflow-hidden shadow-xl group hover:border-brand-red/50 transition-colors"
                  >
                    <div className="bg-neutral-800/30 px-8 py-6 border-b border-neutral-700 flex justify-between items-center cursor-pointer" onClick={() => toggleLogExpansion(workout.id)}>
                      <div className="flex items-center space-x-4">
                        <Calendar className="w-4 h-4 text-brand-red" />
                        <h3 className="font-display italic text-xl uppercase tracking-wider text-white">
                          {(() => {
                            try {
                              const d = new Date(workout.date);
                              if (isNaN(d.getTime())) return 'Unspecified Date';
                              return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            } catch (e) {
                              return 'Unspecified Date';
                            }
                          })()}
                        </h3>
                        <span className="px-3 py-1 bg-brand-red/20 text-brand-red rounded-full text-[8px] font-mono uppercase tracking-widest">Scheduled</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {workout.entries.length > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); startVisualWorkout(`Scheduled: ${new Date(workout.date).toLocaleDateString()}`, workout.entries.map(e => ({ exercise: e.exercise, videoUrl: e.videoUrl, sets: e.sets, reps: e.reps })), workout.notes || ''); }}
                            className="flex items-center space-x-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg transition-colors mr-2"
                          >
                            <Play className="w-3 h-3" />
                            <span className="text-[8px] font-mono uppercase tracking-widest">Start Visual Workout</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDate(workout.date);
                            setEntries(workout.entries.map(e => ({ exercise: e.exercise, sets: e.sets || '', reps: e.reps || '', weight: e.weight || '', videoUrl: e.videoUrl || '' })));
                            setNotes(workout.notes || '');
                            setIsScheduling(false);
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors mr-2"
                        >
                          <ClipboardList className="w-3 h-3" />
                          <span className="text-[8px] font-mono uppercase tracking-widest">Log This Workout</span>
                        </button>
                        {userData?.role === 'TRAINER' && (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(workout.id);
                                setIsScheduling(true);
                                setDate(workout.date);
                                setEntries(workout.entries.map(e => ({ 
                                  exercise: e.exercise, 
                                  sets: e.sets || '', 
                                  reps: e.reps || '', 
                                  weight: e.weight || '',
                                  videoUrl: e.videoUrl || ''
                                })));
                                setNotes(workout.notes || '');
                                setShowForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-neutral-400 font-bold hover:text-emerald-500 transition-colors p-2"
                              title="Edit Scheduled Workout"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(workout.id, 'SCHEDULED'); }}
                              className="text-neutral-50 font-bold hover:text-brand-red transition-colors p-2"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        <button className="p-2 text-white transition-transform">
                          {expandedLogs[workout.id] ? <ChevronDown className="w-5 h-5 rotate-180" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    {expandedLogs[workout.id] && (
                      <div className="p-8 animate-fade-in">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-neutral-700">
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold">Exercise</th>
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold text-center">Sets</th>
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold text-center">Reps</th>
                                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-white font-bold text-center">Target Load (kg)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                              {workout.entries.map((entry, idx) => (
                                <React.Fragment key={idx}>
                                  <tr className="hover:bg-neutral-800/20 transition-colors">
                                    <td className="px-4 py-5 font-mono text-[10px] uppercase tracking-widest text-white flex items-center space-x-3">
                                      <ExerciseAnimation exerciseName={entry.exercise} className="w-8 h-8" minimal />
                                      <span>{entry.exercise}</span>
                                    </td>
                                    <td className="px-4 py-5 font-mono text-[10px] text-neutral-50 font-bold text-center">{entry.sets || '-'}</td>
                                    <td className="px-4 py-5 font-mono text-[10px] text-neutral-50 font-bold text-center">{entry.reps || '-'}</td>
                                    <td className="px-4 py-5 font-mono text-[10px] text-brand-red font-bold text-center">{entry.weight ? `${entry.weight}` : '-'}</td>
                                  </tr>
                                  {entry.videoUrl && (
                                    <tr>
                                      <td colSpan={4} className="px-4 pb-8">
                                        <div className="aspect-video w-full max-w-lg mx-auto rounded-xl overflow-hidden bg-black border border-neutral-700 shadow-lg mt-2">
                                          {entry.videoUrl.includes('youtube') || entry.videoUrl.includes('youtu.be') || entry.videoUrl.includes('vimeo') ? (
                                            <iframe
                                              key={`sched-${entry.videoUrl}`}
                                              src={getEmbedUrl(entry.videoUrl)}
                                              className="w-full h-full"
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                              loading="lazy"
                                              title="Exercise Video"
                                            ></iframe>
                                          ) : (
                                            <video 
                                              src={entry.videoUrl} 
                                              className="w-full h-full object-cover" 
                                              controls 
                                            />
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {workout.notes && (
                          <div className="mt-8 pt-8 border-t border-neutral-700">
                            <p className="text-[8px] font-mono text-neutral-50 font-bold uppercase tracking-[0.3em] mb-3">Trainer Instructions</p>
                            <div className="bg-neutral-800/80 p-6 rounded-2xl border border-neutral-700/50 font-mono text-[10px] text-neutral-50 font-bold leading-relaxed uppercase tracking-wider">
                              {workout.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <VisualWorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        planTitle={currentWorkoutTitle}
        exercises={currentWorkoutExercises}
        planContent={currentWorkoutContent}
      />
    </Layout>
  );
};

export default WorkoutLogs;
