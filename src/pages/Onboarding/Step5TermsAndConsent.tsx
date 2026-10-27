import React, { useState } from 'react';
import { TERMS_AND_CONDITIONS } from '../../constants';
import { TermsConsentData } from '../../types';
import { Shield, FileCheck, Lock } from 'lucide-react';

interface Props {
  termsConsent: Partial<TermsConsentData>;
  clientFullName: string;
  onChange: (termsConsent: Partial<TermsConsentData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

const TERMS_VERSION = '2.5';

const Step5TermsAndConsent: React.FC<Props> = ({
  termsConsent,
  clientFullName,
  onChange,
  onSubmit,
  onBack,
  loading
}) => {
  const [typedName, setTypedName] = useState(termsConsent.typedFullName || '');
  const [accepted, setAccepted] = useState(termsConsent.accepted || false);
  const [validationError, setValidationError] = useState('');

  const handleNameChange = (val: string) => {
    setTypedName(val);
    onChange({
      ...termsConsent,
      typedFullName: val,
      termsVersion: TERMS_VERSION
    });
    setValidationError('');
  };

  const handleAcceptChange = (val: boolean) => {
    setAccepted(val);
    onChange({
      ...termsConsent,
      accepted: val,
      termsVersion: TERMS_VERSION,
      acceptedAt: val ? new Date().toISOString() : ''
    });
    setValidationError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setValidationError('You must read and check the agreement box before submitting.');
      return;
    }
    if (!typedName.trim()) {
      setValidationError('Please type your full legal name to execute the consent agreement.');
      return;
    }

    onChange({
      accepted: true,
      acceptedAt: new Date().toISOString(),
      typedFullName: typedName.trim(),
      termsVersion: TERMS_VERSION
    });

    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-neutral-700/60 pb-4 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF3B30] font-bold">Step 5 of 5</span>
        <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white mt-1">Terms & Consent Agreement</h3>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">Please review the Speed Fit Training Agreement and execute consent.</p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
        <Lock className="w-5 h-5 shrink-0 text-[#FF3B30] mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-white uppercase tracking-wider font-mono">Medical Privacy & Data Protection</p>
          <p className="text-neutral-400 leading-relaxed">
            All medical records, health disclosures, injury logs, and assessments provided are strictly confidential. They are encrypted and accessible only by your certified Speed Fit trainer for program customization and safety oversight.
          </p>
        </div>
      </div>

      {/* Readable Terms and Conditions Window */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-400 uppercase font-bold">Agreement Version: {TERMS_VERSION}</span>
          <span className="text-neutral-500">Speed Fit Fitness Systems</span>
        </div>
        <div className="w-full bg-[#141414] border border-neutral-800 rounded-xl p-4 max-h-56 overflow-y-auto text-xs text-neutral-300 leading-relaxed font-sans space-y-3 custom-scrollbar">
          {TERMS_AND_CONDITIONS.split('\n\n').map((para, i) => (
            <p key={i} className="text-neutral-300">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Unchecked Acceptance Box */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            required
            type="checkbox"
            checked={accepted}
            onChange={(e) => handleAcceptChange(e.target.checked)}
            className="w-5 h-5 accent-[#FF3B30] mt-0.5 rounded cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-white block">
              I have read, understood, and accept the Speed Fit Training Terms & Privacy Agreement *
            </span>
            <span className="text-neutral-400 block mt-0.5">
              By checking this box, I confirm that all health disclosures provided are accurate and that I voluntarily agree to the Speed Fit training guidelines.
            </span>
          </div>
        </label>
      </div>

      {/* Typed Full Name Confirmation */}
      <div className="space-y-1.5">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Type Full Name as Electronic Signature *
        </label>
        <div className="relative">
          <input
            required
            type="text"
            value={typedName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors font-sans"
            placeholder={clientFullName || 'e.g. Rahul Sharma'}
          />
          {typedName.trim().length > 0 && (
            <FileCheck className="w-4 h-4 text-emerald-400 absolute right-4 top-3.5" />
          )}
        </div>
        <p className="text-[11px] font-mono text-neutral-500">
          This digital signature and timestamp ({new Date().toLocaleDateString()}) will be stored with your client profile.
        </p>
      </div>

      {validationError && (
        <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-400 text-xs rounded-xl font-mono">
          {validationError}
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
        <button
          type="button"
          disabled={loading}
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#FF3B30] hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Submitting Assessment...</span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              <span>Complete & Open Dashboard</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default Step5TermsAndConsent;
