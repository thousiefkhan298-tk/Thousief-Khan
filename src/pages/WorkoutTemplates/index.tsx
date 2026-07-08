import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, FileText, Save, ArrowLeft, Play, X, Video } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';
import { WorkoutTemplate, WorkoutTemplateEntry, User } from '../../types';
import VisualWorkoutModal from '../../components/VisualWorkoutModal';

interface WorkoutTemplatesProps {
  user: User;
}

const WorkoutTemplates: React.FC<WorkoutTemplatesProps> = ({ user }) => {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [name, setName] = useState('');
  const [entries, setEntries] = useState<WorkoutTemplateEntry[]>([]);

  // Visual Workout State
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [currentWorkoutTitle, setCurrentWorkoutTitle] = useState('');
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState<{ exercise: string; videoUrl?: string; sets?: string; reps?: string }[]>([]);

  useEffect(() => {
    if (user?.id) {
      return firebaseService.subscribeToWorkoutTemplates(user.id, setTemplates);
    }
  }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const template: WorkoutTemplate = {
      id: editingTemplate?.id || '',
      trainerId: user.id,
      name,
      entries,
      createdAt: new Date().toISOString()
    };
    await firebaseService.saveWorkoutTemplate(template);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setName('');
    setEntries([]);
  };

  const addEntry = () => {
    setEntries([...entries, { exercise: '', defaultSets: '', defaultReps: '', defaultWeight: '' }]);
  };

  const removeEntry = (index: number) => {
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
  };

  const updateEntry = (index: number, field: keyof WorkoutTemplateEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const startVisualWorkout = (template: WorkoutTemplate) => {
    setCurrentWorkoutTitle(template.name);
    setCurrentWorkoutExercises(template.entries.map(e => ({ exercise: e.exercise, videoUrl: e.videoUrl, sets: e.defaultSets, reps: e.defaultReps })));
    setIsWorkoutModalOpen(true);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => window.history.back()} className="flex items-center space-x-2 text-white mb-6">
        <ArrowLeft className="w-5 h-5"/>
        <span>Go Back</span>
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white uppercase italic">Workout Templates</h1>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-red text-white px-4 py-2 rounded-xl"
        >
          <Plus className="inline w-5 h-5 mr-2" />
          Add Template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-neutral-800 border border-neutral-700 p-6 rounded-2xl mb-8">
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-neutral-800 p-3 rounded-lg mb-4 text-white"
            placeholder="Template Name"
            required
          />
          {entries.map((entry, index) => (
            <div key={index} className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-700/50 mb-3 space-y-3 relative group">
              <button type="button" onClick={() => removeEntry(index)} className="absolute -top-2 -right-2 bg-neutral-800 text-neutral-400 hover:text-brand-red w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <X className="w-3 h-3" />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input value={entry.exercise} onChange={(e) => updateEntry(index, 'exercise', e.target.value)} placeholder="Exercise Name" className="w-full bg-neutral-800 border border-neutral-700 p-2.5 rounded-lg text-white" />
                <input value={entry.defaultSets} onChange={(e) => updateEntry(index, 'defaultSets', e.target.value)} placeholder="Sets (e.g. 3)" className="w-full bg-neutral-800 border border-neutral-700 p-2.5 rounded-lg text-white" />
                <input value={entry.defaultReps} onChange={(e) => updateEntry(index, 'defaultReps', e.target.value)} placeholder="Reps (e.g. 10-12)" className="w-full bg-neutral-800 border border-neutral-700 p-2.5 rounded-lg text-white" />
                <input value={entry.defaultWeight} onChange={(e) => updateEntry(index, 'defaultWeight', e.target.value)} placeholder="Weight (e.g. 50kg)" className="w-full bg-neutral-800 border border-neutral-700 p-2.5 rounded-lg text-white" />
              </div>
              <div className="flex items-center space-x-2 px-1">
                <Video className="w-4 h-4 text-neutral-500" />
                <input value={entry.videoUrl || ''} onChange={(e) => updateEntry(index, 'videoUrl', e.target.value)} placeholder="Exercise Video Link (YouTube, Vimeo, etc. Optional)" className="flex-1 bg-transparent border-b border-neutral-700 focus:border-brand-red py-1.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addEntry} className="flex items-center space-x-2 text-brand-red hover:text-red-400 mb-6 font-mono text-[10px] uppercase tracking-widest transition-colors">
            <Plus className="w-3 h-3" />
            <span>Add Exercise</span>
          </button>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-xl">Save</button>
        </form>
      )}

      <div className="space-y-4">
        {templates.map(template => (
          <div key={template.id} className="bg-neutral-800 p-6 rounded-2xl flex justify-between items-center">
            <h3 className="text-lg text-white font-bold">{template.name}</h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => startVisualWorkout(template)}
                className="flex items-center space-x-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg transition-colors mr-2"
              >
                <Play className="w-3 h-3" />
                <span className="text-[8px] font-mono uppercase tracking-widest">Start Visual Workout</span>
              </button>
              <button onClick={() => { setEditingTemplate(template); setName(template.name); setEntries(template.entries); setShowForm(true); }} className="text-blue-500 mr-2"><Edit2 /></button>
              <button onClick={() => firebaseService.deleteWorkoutTemplate(template.id)} className="text-brand-red"><Trash2 /></button>
            </div>
          </div>
        ))}
      </div>

      <VisualWorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        planTitle={currentWorkoutTitle}
        exercises={currentWorkoutExercises}
        planContent="Template execution."
      />
    </div>
  );
};

export default WorkoutTemplates;
