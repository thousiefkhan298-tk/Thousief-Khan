import React from 'react';
import { HealthAssessment, ConcernForm } from '../../types';

interface Props {
  assessment: Partial<HealthAssessment>;
  concern: Partial<ConcernForm>;
  onChangeAssessment: (assessment: Partial<HealthAssessment>) => void;
  onChangeConcern: (concern: Partial<ConcernForm>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepGoalsAndConcerns: React.FC<Props> = ({ assessment, concern, onChangeAssessment, onChangeConcern, onNext, onBack }) => {
  const handleChangeAssessment = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    onChangeAssessment({ ...assessment, [e.target.name]: value });
  };

  const handleChangeConcern = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChangeConcern({ ...concern, [e.target.name]: e.target.value });
  };

  const handleGoalToggle = (goal: string) => {
    const currentGoals = assessment.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    onChangeAssessment({ ...assessment, goals: newGoals });
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
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Primary Concern</label>
          <textarea required name="primaryConcern" value={concern.primaryConcern || ''} onChange={handleChangeConcern} className="input-field" rows={2} placeholder="WHAT IS YOUR MAIN GOAL OR CONCERN?" />
        </div>
        
        <div className="space-y-4">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Primary Goals</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {goalOptions.map(goal => (
              <button
                key={goal}
                type="button"
                onClick={() => handleGoalToggle(goal)}
                className={`p-4 rounded-2xl border font-mono text-[10px] uppercase tracking-wider transition-all text-left ${
                  (assessment.goals || []).includes(goal)
                    ? 'border-brand-red bg-brand-red/10 text-brand-red shadow-[0_0_15px_rgba(255,0,0,0.1)]'
                    : 'border-neutral-700 text-white font-bold hover:border-neutral-700 hover:text-white font-bold'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Target Weight (kg)</label>
            <input type="number" name="targetWeight" value={assessment.targetWeight || ''} onChange={handleChangeAssessment} className="input-field" placeholder="00.0" />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Target Deadline</label>
            <input type="date" name="targetDate" value={assessment.targetDate || ''} onChange={handleChangeAssessment} className="input-field" />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-8 border-t border-neutral-700">
        <button type="button" onClick={onBack} className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button type="submit" className="bg-brand-red text-white px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(255,0,0,0.3)]">
          Continue
        </button>
      </div>
    </form>
  );
};

export default StepGoalsAndConcerns;
