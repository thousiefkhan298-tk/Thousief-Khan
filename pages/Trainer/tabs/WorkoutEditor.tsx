
import React, { useState } from 'react';
import { User } from '../../../types';
import { store } from '../../../store';

const WorkoutEditor: React.FC<{ clients: User[] }> = ({ clients }) => {
  const [activeClient, setActiveClient] = useState<string>('');
  const [workout, setWorkout] = useState('');

  const handleSave = async () => {
    if (activeClient && workout) {
      await store.saveWorkout(activeClient, workout);
      alert('Workout plan saved and published to client.');
    }
  };

  const applyTemplate = () => {
    const template = `PHASE 1: STRENGTH & HYPERTROPHY
---------------------------------
DAY 1: PUSH (Chest, Shoulders, Triceps)
- Flat Bench Press: 4 x 8-10
- Incline DB Flyes: 3 x 12
- Military Press: 3 x 10
- Lateral Raises: 4 x 15
- Tricep Pushdowns: 3 x 12

DAY 2: PULL (Back, Biceps)
- Deadlifts: 3 x 5
- Pull Ups: 3 x Max
- Seated Row: 3 x 12
- Face Pulls: 3 x 15
- Hammer Curls: 3 x 12

DAY 3: LEGS
- Squats: 4 x 8
- Leg Press: 3 x 15
- Leg Curls: 3 x 12
- Calf Raises: 4 x 20`;
    setWorkout(template);
  };

  const handleSelectClient = async (id: string) => {
    setActiveClient(id);
    const data = await store.getClientData(id);
    setWorkout(data.workout?.plan || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-4">Select Client</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectClient(c.id)}
              className={`w-full p-4 rounded-2xl text-left border transition-all ${activeClient === c.id ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-white border-black/5 text-neutral-600 hover:border-red-600/20'}`}
            >
              <div className="text-sm font-bold truncate">{c.name || c.email}</div>
              <div className={`text-[10px] uppercase font-black ${activeClient === c.id ? 'text-white/60' : 'text-neutral-400'}`}>Click to edit</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3">
        {activeClient ? (
          <div className="bg-white border border-black/5 rounded-3xl p-8 space-y-6 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-black">Plan Editor</h3>
              <div className="flex gap-3">
                <button onClick={applyTemplate} className="px-4 py-2 bg-neutral-50 text-neutral-500 font-bold rounded-full hover:bg-neutral-100 transition-all text-xs border border-black/5">
                  <i className="fas fa-copy mr-2"></i> Use Template
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 transition-all text-sm shadow-lg shadow-red-600/20">Save & Publish</button>
              </div>
            </div>
            
            <textarea 
              value={workout}
              onChange={(e) => setWorkout(e.target.value)}
              className="w-full h-96 bg-neutral-50 border border-black/5 rounded-2xl p-6 font-mono text-sm focus:border-red-600 focus:outline-none text-black"
              placeholder="Structure the workout plan here... (e.g. Day 1: Chest/Tris...)"
            ></textarea>
            
            <div className="p-4 bg-red-600/5 border border-red-600/20 rounded-2xl flex items-start gap-4">
               <i className="fas fa-magic text-red-600 mt-1"></i>
               <div>
                  <p className="text-xs font-bold text-black uppercase">AI Assistant Tip</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">Structure plans with sets, reps, and rest periods. Clients can view this in real-time from their dashboard once published.</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-neutral-400 border border-dashed border-black/10 rounded-3xl bg-white">
            <i className="fas fa-dumbbell text-4xl mb-4 text-neutral-200"></i>
            <p className="font-bold uppercase tracking-widest text-sm">Select a client to start training</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutEditor;
