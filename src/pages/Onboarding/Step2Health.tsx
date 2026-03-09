import React from 'react';
import { HealthAssessment } from '../../types';

interface Props {
  assessment: Partial<HealthAssessment>;
  onChange: (assessment: Partial<HealthAssessment>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Health: React.FC<Props> = ({ assessment, onChange, onNext, onBack }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    onChange({ ...assessment, [e.target.name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Height (cm)</label>
          <input required type="number" name="height" value={assessment.height || ''} onChange={handleChange} className="input-field" placeholder="000" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Weight (kg)</label>
          <input required type="number" name="weight" value={assessment.weight || ''} onChange={handleChange} className="input-field" placeholder="00.0" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Blood Pressure (Sys/Dia)</label>
          <input type="text" name="bloodPressure" value={assessment.bloodPressure || ''} onChange={handleChange} placeholder="120/80" className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Sleep Cycle (Hours)</label>
          <input required type="number" name="sleepHours" value={assessment.sleepHours || ''} onChange={handleChange} className="input-field" placeholder="0" />
        </div>
        
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Occupation Type</label>
          <select required name="occupation" value={assessment.occupation || 'Sedentary'} onChange={handleChange} className="input-field appearance-none">
            <option value="Sedentary" className="bg-neutral-900">SEDENTARY (DESK)</option>
            <option value="Active" className="bg-neutral-900">ACTIVE (PHYSICAL)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Stress Level</label>
          <select required name="stress" value={assessment.stress || 'Low'} onChange={handleChange} className="input-field appearance-none">
            <option value="Low" className="bg-neutral-900">LOW</option>
            <option value="Moderate" className="bg-neutral-900">MODERATE</option>
            <option value="High" className="bg-neutral-900">HIGH</option>
          </select>
        </div>

        <div className="md:col-span-2 space-y-6 bg-neutral-800/30 p-6 rounded-3xl border border-neutral-800">
          <label className="flex items-center space-x-4 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" name="smoking" checked={assessment.smoking || false} onChange={handleChange} className="sr-only" />
              <div className={`w-6 h-6 border-2 rounded-md transition-all ${assessment.smoking ? 'bg-brand-red border-brand-red' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                {assessment.smoking && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Tobacco Consumption Protocol</span>
          </label>
          <label className="flex items-center space-x-4 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" name="alcohol" checked={assessment.alcohol || false} onChange={handleChange} className="sr-only" />
              <div className={`w-6 h-6 border-2 rounded-md transition-all ${assessment.alcohol ? 'bg-brand-red border-brand-red' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                {assessment.alcohol && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Regular Alcohol Intake</span>
          </label>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Current Medications</label>
          <textarea name="medications" value={assessment.medications || ''} onChange={handleChange} rows={2} className="input-field" placeholder="LIST ACTIVE PHARMACEUTICALS..."></textarea>
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Medical History / Injuries</label>
          <textarea name="otherConditions" value={assessment.otherConditions || ''} onChange={handleChange} rows={3} className="input-field" placeholder="RECORD PAST TRAUMA OR CHRONIC CONDITIONS..."></textarea>
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

export default Step2Health;
