import React, { useState } from 'react';
import { HealthAssessment } from '../../types';
import { TERMS_AND_CONDITIONS } from '../../constants';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  assessment: Partial<HealthAssessment>;
  onChange: (assessment: Partial<HealthAssessment>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const Step4Consent: React.FC<Props> = ({ assessment, onChange, onSubmit, onBack }) => {
  const [agreed, setAgreed] = useState(assessment.consentGiven || false);
  const [concerns, setConcerns] = useState(assessment.healthConcerns || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    
    onChange({ 
      ...assessment, 
      consentGiven: true, 
      consentDate: new Date().toISOString(),
      healthConcerns: concerns
    });
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="space-y-8">
        <div className="bg-neutral-900/50 p-8 rounded-[2.5rem] border border-neutral-800 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <ShieldCheck className="w-5 h-5 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider text-white">Consent & Liability Waiver</h3>
          </div>
          
          <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 h-64 overflow-y-auto custom-scrollbar mb-8">
            <p className="text-neutral-400 font-mono text-[10px] leading-relaxed whitespace-pre-wrap uppercase tracking-wider">
              {TERMS_AND_CONDITIONS}
            </p>
          </div>

          <label className="flex items-start space-x-4 cursor-pointer group">
            <div className="relative mt-1">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)} 
                className="sr-only" 
              />
              <div className={`w-6 h-6 border-2 rounded-md transition-all ${agreed ? 'bg-brand-red border-brand-red' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                {agreed && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-300 leading-relaxed">
              I HAVE READ, UNDERSTOOD, AND AGREE TO THE TERMS AND CONDITIONS STATED ABOVE. I CONFIRM THAT THE INFORMATION PROVIDED IN THIS HEALTH ASSESSMENT IS ACCURATE TO THE BEST OF MY KNOWLEDGE.
            </span>
          </label>
        </div>

        <div className="bg-neutral-900/50 p-8 rounded-[2.5rem] border border-neutral-800 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <AlertCircle className="w-5 h-5 text-brand-red" />
            <h3 className="text-xl font-display italic uppercase tracking-wider text-white">Additional Concerns</h3>
          </div>
          
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">
              DO YOU HAVE ANY OTHER HEALTH CONCERNS OR SPECIFIC AREAS YOU WANT TO DISCUSS WITH YOUR TRAINER?
            </label>
            <textarea 
              value={concerns} 
              onChange={(e) => setConcerns(e.target.value)} 
              rows={4} 
              className="input-field" 
              placeholder="RECORD ANY ADDITIONAL INTEL HERE..."
            ></textarea>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-8 border-t border-neutral-800">
        <button type="button" onClick={onBack} className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button 
          type="submit" 
          disabled={!agreed}
          className={`px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl ${agreed ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}`}
        >
          Complete Setup
        </button>
      </div>
    </form>
  );
};

export default Step4Consent;
