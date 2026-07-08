import React, { useMemo } from 'react';
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

  const liveBMI = useMemo(() => {
    const h = parseFloat(assessment.height || '0');
    const w = parseFloat(assessment.weight || '0');
    if (!h || !w || h < 100 || w < 20) return null;
    const hm = h / 100;
    const bmi = Math.round((w / (hm * hm)) * 10) / 10;
    let cat: string, color: string;
    if (bmi < 18.5) { cat = 'Underweight'; color = '#3b82f6'; }
    else if (bmi < 25) { cat = 'Normal — Healthy'; color = '#22c55e'; }
    else if (bmi < 30) { cat = 'Overweight'; color = '#f59e0b'; }
    else { cat = 'Obese'; color = '#ef4444'; }
    return { bmi, cat, color };
  }, [assessment.height, assessment.weight]);

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">My Height (in cm)</label>
          <input required type="number" name="height" value={assessment.height || ''} onChange={handleChange} className="input-field" placeholder="Height in cm (e.g. 175)" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">My Weight (in kg)</label>
          <input required type="number" name="weight" value={assessment.weight || ''} onChange={handleChange} className="input-field" placeholder="Weight in kg (e.g. 70)" />
        </div>

        {liveBMI && (
          <div className="md:col-span-2 bg-neutral-950/50 border border-neutral-700 rounded-3xl p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <p className="text-[8px] font-mono uppercase tracking-widest text-neutral-400 font-bold mb-1">Live BMI Preview</p>
              <p className="text-4xl font-display italic text-white">{liveBMI.bmi}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-mono uppercase tracking-widest text-[#B2B2B2] font-bold mb-1">Category</p>
              <p className="text-xl font-display italic uppercase" style={{ color: liveBMI.color }}>{liveBMI.cat}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-mono uppercase tracking-widest text-[#B2B2B2] font-bold mb-1">Full Report</p>
              <p className="text-xs font-mono text-[#B2B2B2] uppercase">Next screen →</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Average sleep per day (Hours)</label>
          <input required type="number" name="sleepHours" value={assessment.sleepHours || ''} onChange={handleChange} className="input-field" placeholder="Sleep in hours" />
        </div>
        
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">What is your daily work like?</label>
          <select required name="occupation" value={assessment.occupation || 'Sedentary'} onChange={handleChange} className="input-field appearance-none">
            <option value="Sedentary" className="bg-neutral-800">Desk job (sitting most of the day)</option>
            <option value="Active" className="bg-neutral-800">Active job (standing/walking/lifting)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">How is your stress level?</label>
          <select required name="stress" value={assessment.stress || 'Low'} onChange={handleChange} className="input-field appearance-none">
            <option value="Low" className="bg-neutral-800">Low stress</option>
            <option value="Moderate" className="bg-neutral-800">Medium stress</option>
            <option value="High" className="bg-neutral-800">High stress</option>
          </select>
        </div>

        <div className="md:col-span-2 space-y-6 bg-neutral-800/30 p-6 rounded-3xl border border-neutral-700">
          <label className="flex items-center space-x-4 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" name="smoking" checked={assessment.smoking || false} onChange={handleChange} className="sr-only" />
              <div className={`w-6 h-6 border-2 rounded-md transition-all ${assessment.smoking ? 'bg-brand-red border-brand-red' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                {assessment.smoking && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-50 font-bold">Do you consume tobacco/smoke?</span>
          </label>
          <label className="flex items-center space-x-4 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" name="alcohol" checked={assessment.alcohol || false} onChange={handleChange} className="sr-only" />
              <div className={`w-6 h-6 border-2 rounded-md transition-all ${assessment.alcohol ? 'bg-brand-red border-brand-red' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                {assessment.alcohol && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-50 font-bold">Do you drink alcohol regularly?</span>
          </label>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Are you taking any medicine? (Optional)</label>
          <textarea name="medications" value={assessment.medications || ''} onChange={handleChange} rows={2} className="input-field" placeholder="List any medicines here, or leave empty..."></textarea>
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-white font-bold ml-1">Do you have any past injuries or medical issues? (Optional)</label>
          <textarea name="otherConditions" value={assessment.otherConditions || ''} onChange={handleChange} rows={3} className="input-field" placeholder="List any past injuries, back pain, knee issues or other conditions here..."></textarea>
        </div>
      </div>
      
      <div className="flex justify-between pt-8 border-t border-neutral-700">
        <button type="button" onClick={onBack} className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button type="submit" className="bg-white text-black px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-xl">
          Next Step
        </button>
      </div>
    </form>
  );
};

export default Step2Health;
