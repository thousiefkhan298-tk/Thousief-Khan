import React from 'react';
import { ConcernForm } from '../../types';

interface Props {
  concern: Partial<ConcernForm>;
  onChange: (concern: Partial<ConcernForm>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepConcern: React.FC<Props> = ({ concern, onChange, onNext, onBack }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange({ ...concern, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Primary Concern</label>
          <textarea required name="primaryConcern" value={concern.primaryConcern || ''} onChange={handleChange} className="input-field" rows={2} placeholder="WHAT IS YOUR MAIN GOAL OR CONCERN?" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Secondary Concern</label>
          <textarea name="secondaryConcern" value={concern.secondaryConcern || ''} onChange={handleChange} className="input-field" rows={2} placeholder="ANY OTHER AREAS OF FOCUS?" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Expectations</label>
          <textarea required name="expectations" value={concern.expectations || ''} onChange={handleChange} className="input-field" rows={2} placeholder="WHAT DO YOU EXPECT TO ACHIEVE?" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Physical Limitations</label>
          <textarea name="limitations" value={concern.limitations || ''} onChange={handleChange} className="input-field" rows={2} placeholder="ANY INJURIES OR LIMITATIONS?" />
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

export default StepConcern;
