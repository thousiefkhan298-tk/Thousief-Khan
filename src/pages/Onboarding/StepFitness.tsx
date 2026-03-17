import React from 'react';
import { FitnessAssessment } from '../../types';

interface Props {
  assessment: Partial<FitnessAssessment>;
  onChange: (assessment: Partial<FitnessAssessment>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepFitness: React.FC<Props> = ({ assessment, onChange, onNext, onBack }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...assessment, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Push-Ups (Max Reps)</label>
          <input required type="number" name="pushUps" value={assessment.pushUps || ''} onChange={handleChange} className="input-field" placeholder="0" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Step Test (BPM)</label>
          <input required type="number" name="stepTestBpm" value={assessment.stepTestBpm || ''} onChange={handleChange} className="input-field" placeholder="0" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Performance Test (Wall Sit/Air Dyne)</label>
          <textarea name="performanceTest" value={assessment.performanceTest || ''} onChange={handleChange} className="input-field" rows={2} placeholder="RECORD PERFORMANCE METRICS..." />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Posture Analysis</label>
          <textarea name="postureAnalysis" value={assessment.postureAnalysis || ''} onChange={handleChange} className="input-field" rows={2} placeholder="OBSERVATIONS ON POSTURE..." />
        </div>
      </div>
      
      <div className="flex justify-between pt-8 border-t border-neutral-800">
        <button type="button" onClick={onBack} className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button type="submit" className="bg-white text-black px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-xl">
          Next Phase
        </button>
      </div>
    </form>
  );
};

export default StepFitness;
