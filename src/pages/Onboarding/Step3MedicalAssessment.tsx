import React from 'react';
import { MedicalAssessmentData } from '../../types';
import { HEALTH_CONDITIONS, PAIN_ACTIVITIES } from '../../constants';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  medical: Partial<MedicalAssessmentData>;
  onChange: (medical: Partial<MedicalAssessmentData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3MedicalAssessment: React.FC<Props> = ({ medical, onChange, onNext, onBack }) => {
  const noKnown = medical.noKnownConditions === true;
  const selectedConditions = medical.conditions || [];
  const selectedPain = medical.painOrRestrictions || [];

  const handleToggleNoConditions = (checked: boolean) => {
    if (checked) {
      onChange({
        ...medical,
        noKnownConditions: true,
        conditions: [],
        otherConditions: '',
        injuriesOrSurgeries: 'None',
        painOrRestrictions: ['None'],
        medications: 'None',
        allergies: 'None',
        doctorRestrictions: 'None',
        flaggedForReview: false
      });
    } else {
      onChange({
        ...medical,
        noKnownConditions: false,
        injuriesOrSurgeries: '',
        painOrRestrictions: [],
        medications: '',
        allergies: '',
        doctorRestrictions: ''
      });
    }
  };

  const toggleCondition = (cond: string) => {
    const updated = selectedConditions.includes(cond)
      ? selectedConditions.filter(c => c !== cond)
      : [...selectedConditions, cond];
    const willBeFlagged = updated.length > 0 || (medical.injuriesOrSurgeries && medical.injuriesOrSurgeries !== 'None');
    onChange({
      ...medical,
      noKnownConditions: false,
      conditions: updated,
      flaggedForReview: Boolean(willBeFlagged)
    });
  };

  const togglePain = (activity: string) => {
    let updated: string[];
    if (activity === 'None') {
      updated = ['None'];
    } else {
      updated = selectedPain.filter(p => p !== 'None');
      if (updated.includes(activity)) {
        updated = updated.filter(p => p !== activity);
      } else {
        updated.push(activity);
      }
    }
    onChange({ ...medical, painOrRestrictions: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if flagged for review
    const hasConditions = selectedConditions.length > 0 || (medical.otherConditions && medical.otherConditions.trim().length > 0);
    const hasInjuries = medical.injuriesOrSurgeries && medical.injuriesOrSurgeries.trim().toLowerCase() !== 'none';
    const hasDoctorRestrictions = medical.doctorRestrictions && medical.doctorRestrictions.trim().toLowerCase() !== 'none';
    const flagged = Boolean(hasConditions || hasInjuries || hasDoctorRestrictions);

    onChange({
      ...medical,
      flaggedForReview: flagged
    });

    onNext();
  };

  const isFlagged = !noKnown && (
    selectedConditions.length > 0 ||
    (medical.injuriesOrSurgeries && medical.injuriesOrSurgeries.trim().toLowerCase() !== 'none' && medical.injuriesOrSurgeries.trim() !== '') ||
    (medical.doctorRestrictions && medical.doctorRestrictions.trim().toLowerCase() !== 'none' && medical.doctorRestrictions.trim() !== '')
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-neutral-700/60 pb-4 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF3B30] font-bold">Step 3 of 5</span>
        <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white mt-1">Medical Assessment</h3>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">
          Health history, existing conditions, pain points, and physical restrictions. All information is confidential.
        </p>
      </div>

      {/* Primary Check: No known conditions option */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={noKnown}
            onChange={(e) => handleToggleNoConditions(e.target.checked)}
            className="w-5 h-5 accent-[#FF3B30] mt-0.5 rounded cursor-pointer"
          />
          <div>
            <span className="text-sm font-bold text-white block">I have no known medical conditions, injuries, or surgeries</span>
            <span className="text-xs text-neutral-400 font-mono block mt-0.5">
              Select this if you have no cardiovascular, metabolic, joint, or surgical restrictions to exercise.
            </span>
          </div>
        </label>
      </div>

      {!noKnown && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Conditions checklist */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Existing Medical Conditions (Check all that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HEALTH_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <button
                    type="button"
                    key={cond}
                    onClick={() => toggleCondition(cond)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white font-semibold'
                        : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span>{cond}</span>
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'border-neutral-600'
                    }`}>
                      {isSelected && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Conditions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Other Medical Conditions (if not listed above)
            </label>
            <input
              type="text"
              value={medical.otherConditions || ''}
              onChange={(e) => onChange({ ...medical, otherConditions: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
              placeholder="e.g. Thyroid, Vertigo, Cervical spondylosis"
            />
          </div>

          {/* Past Injuries or Surgeries */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Past Injuries, Surgeries, or Fractures *
            </label>
            <textarea
              required
              rows={2}
              value={medical.injuriesOrSurgeries || ''}
              onChange={(e) => onChange({ ...medical, injuriesOrSurgeries: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors resize-none font-sans"
              placeholder="Detail any past ligament tears (ACL, meniscus), back herniation, shoulder dislocations, or surgeries (or type 'None')."
            />
          </div>

          {/* Current Pain or Movement Restrictions */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Current Pain or Movement Restrictions during daily activities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PAIN_ACTIVITIES.map((act) => {
                const isSelected = selectedPain.includes(act);
                return (
                  <button
                    type="button"
                    key={act}
                    onClick={() => togglePain(act)}
                    className={`p-3 rounded-xl border text-center text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white font-bold'
                        : 'bg-[#1A1A1A] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Medications */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Current Medications & Dosage *
            </label>
            <input
              required
              type="text"
              value={medical.medications || ''}
              onChange={(e) => onChange({ ...medical, medications: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
              placeholder="e.g. Metformin 500mg, BP medication, or type 'None'"
            />
          </div>

          {/* Known Allergies */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Known Allergies (Food, Chemical, Environment) *
            </label>
            <input
              required
              type="text"
              value={medical.allergies || ''}
              onChange={(e) => onChange({ ...medical, allergies: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
              placeholder="e.g. Peanut allergy, Lactose, Dust allergy, or type 'None'"
            />
          </div>

          {/* Doctor Restrictions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              Relevant Doctor-Advised Exercise Restrictions *
            </label>
            <textarea
              required
              rows={2}
              value={medical.doctorRestrictions || ''}
              onChange={(e) => onChange({ ...medical, doctorRestrictions: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors resize-none font-sans"
              placeholder="Has a physician advised you to avoid heavy lifting, high impact, or overhead pressing? (or type 'None')."
            />
          </div>

          {/* Flag Notice */}
          {isFlagged && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="text-xs space-y-1 font-mono">
                <p className="font-bold uppercase tracking-wider">Trainer Review Flagged</p>
                <p className="text-amber-200/90 leading-relaxed font-sans">
                  The health considerations you reported will be flagged directly for your certified Speed Fit trainer's review prior to formulating your exercise program. Speed Fit does not automatically diagnose conditions or provide clinical medical clearance.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {noKnown && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          <div className="text-xs font-mono">
            <p className="font-bold uppercase tracking-wider">No Known Medical Restrictions Reported</p>
            <p className="text-emerald-200/90 font-sans mt-0.5">
              You have reported no active cardiovascular, musculoskeletal, or doctor-advised exercise limitations.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="bg-[#FF3B30] hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Diet Preferences</span>
          <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default Step3MedicalAssessment;
