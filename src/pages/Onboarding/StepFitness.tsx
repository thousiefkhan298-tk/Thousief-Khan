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
    const { name, value } = e.target;
    if (['pushUps', 'stepTestBpm', 'maximalWallSitTime', 'calorieBurnAirDyne', 'maximalPlankTime'].includes(name)) {
      onChange({
        ...assessment,
        physicalTests: {
          ...assessment.physicalTests as any,
          [name]: value
        }
      });
    } else {
      onChange({ ...assessment, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">How many push-ups can you do without stopping?</label>
          <input required type="number" name="pushUps" value={assessment.physicalTests?.pushUps || ''} onChange={handleChange} className="input-field" placeholder="Enter number of push-ups" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Your heart rate after a step test (Heartbeats per minute)</label>
          <input required type="number" name="stepTestBpm" value={assessment.physicalTests?.stepTestBpm || ''} onChange={handleChange} className="input-field" placeholder="Beats per minute (or 0 if not known)" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Any other physical fitness or exercise notes? (Optional)</label>
          <textarea name="notes" value={assessment.notes || ''} onChange={handleChange} className="input-field" rows={2} placeholder="Type any comments about your strength, workouts, or running records..." />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">How is your standing body posture? (Optional)</label>
          <textarea name="postureAnalysis" value={assessment.postureAnalysis || ''} onChange={handleChange} className="input-field" rows={2} placeholder="Describe any slouched shoulders, neck tilt, uneven hips, or normal alignment..." />
        </div>
      </div>
      
      <div className="flex justify-between pt-8 border-t border-neutral-700">
        <button type="button" onClick={onBack} className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button type="submit" className="bg-white text-black px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-xl">
          Submit Profile
        </button>
      </div>
    </form>
  );
};

export default StepFitness;
