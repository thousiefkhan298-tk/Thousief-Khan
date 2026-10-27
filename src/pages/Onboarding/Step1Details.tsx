import React from 'react';
import { ClientDetails } from '../../types';

interface Props {
  details: Partial<ClientDetails>;
  onChange: (details: Partial<ClientDetails>) => void;
  onNext: () => void;
}

const Step1Details: React.FC<Props> = ({ details, onChange, onNext }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...details, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-neutral-700/60 pb-4 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF3B30] font-bold">Step 1 of 5</span>
        <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white mt-1">Basic Profile</h3>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">Please provide your contact information and emergency details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Full Name *</label>
          <input
            required
            type="text"
            name="fullName"
            value={details.fullName || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
            placeholder="e.g. Rahul Sharma"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Email Address *</label>
          <input
            required
            type="email"
            name="email"
            value={details.email || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-400 opacity-75 cursor-not-allowed"
            disabled
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Date of Birth *</label>
          <input
            required
            type="date"
            name="dob"
            value={details.dob || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Phone Number *</label>
          <input
            required
            type="tel"
            name="phoneNumber"
            value={details.phoneNumber || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Occupation / Daily Work Style *</label>
          <input
            required
            type="text"
            name="occupation"
            value={details.occupation || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
            placeholder="e.g. Software Engineer (Desk Job), Business Owner, Teacher"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Emergency Contact (Name & Phone Number) *</label>
          <input
            required
            type="text"
            name="emergencyContact"
            value={details.emergencyContact || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
            placeholder="e.g. Priya Sharma (Spouse) - +91 98765 00000"
          />
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-neutral-800">
        <button
          type="submit"
          className="bg-[#FF3B30] hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Fitness Assessment</span>
          <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default Step1Details;
