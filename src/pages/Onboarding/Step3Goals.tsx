import React from 'react';
import { HealthAssessment } from '../../types';

interface Props {
  assessment: Partial<HealthAssessment>;
  onChange: (assessment: Partial<HealthAssessment>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3Goals: React.FC<Props> = ({ assessment, onChange, onNext, onBack }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    onChange({ ...assessment, [e.target.name]: value });
  };

  const handleGoalToggle = (goal: string) => {
    const currentGoals = assessment.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    onChange({ ...assessment, goals: newGoals });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const goalOptions = [
    'Weight Loss', 'Muscle Gain', 'Improve Endurance', 
    'Flexibility/Mobility', 'Strength Training', 'General Fitness'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="space-y-8">
        <div className="space-y-4">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Primary Goals</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {goalOptions.map(goal => (
              <button
                key={goal}
                type="button"
                onClick={() => handleGoalToggle(goal)}
                className={`p-4 rounded-2xl border font-mono text-[10px] uppercase tracking-wider transition-all text-left ${
                  (assessment.goals || []).includes(goal)
                    ? 'border-brand-red bg-brand-red/10 text-brand-red shadow-[0_0_15px_rgba(255,0,0,0.1)]'
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Target Weight (kg)</label>
            <input type="number" name="targetWeight" value={assessment.targetWeight || ''} onChange={handleChange} className="input-field" placeholder="00.0" />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Target Deadline</label>
            <input type="date" name="targetDate" value={assessment.targetDate || ''} onChange={handleChange} className="input-field" />
          </div>
        </div>

        <div className="bg-neutral-800/30 p-6 rounded-3xl border border-neutral-800">
          <label className="flex items-center space-x-4 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" name="currentlyActive" checked={assessment.currentlyActive || false} onChange={handleChange} className="sr-only" />
              <div className={`w-6 h-6 border-2 rounded-md transition-all ${assessment.currentlyActive ? 'bg-brand-red border-brand-red' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                {assessment.currentlyActive && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Active Duty Status (Currently Training)</span>
          </label>
        </div>

        {assessment.currentlyActive && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Training Frequency (Weekly)</label>
            <select name="trainingDaysPerWeek" value={assessment.trainingDaysPerWeek || ''} onChange={handleChange} className="input-field appearance-none">
              <option value="" className="bg-neutral-900">SELECT FREQUENCY</option>
              <option value="1-2" className="bg-neutral-900">1-2 DAYS</option>
              <option value="3-4" className="bg-neutral-900">3-4 DAYS</option>
              <option value="5+" className="bg-neutral-900">5+ DAYS</option>
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Operational Experience</label>
          <textarea name="pastExperience" value={assessment.pastExperience || ''} onChange={handleChange} rows={3} className="input-field" placeholder="DESCRIBE PREVIOUS TRAINING PROTOCOLS..."></textarea>
        </div>
      </div>
      
      <div className="flex justify-between pt-8 border-t border-neutral-800">
        <button type="button" onClick={onBack} className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button type="submit" className="bg-brand-red text-white px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(255,0,0,0.3)]">
          Continue
        </button>
      </div>
    </form>
  );
};

export default Step3Goals;
