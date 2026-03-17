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
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Full Name</label>
          <input required type="text" name="fullName" value={details.fullName || ''} onChange={handleChange} className="input-field" placeholder="RECRUIT NAME" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Email Address</label>
          <input required type="email" name="email" value={details.email || ''} onChange={handleChange} className="input-field opacity-50 cursor-not-allowed" disabled />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Date of Birth</label>
          <input required type="date" name="dob" value={details.dob || ''} onChange={handleChange} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Age</label>
          <input required type="number" name="age" value={details.age || ''} onChange={handleChange} className="input-field" placeholder="00" />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Gender Identity</label>
          <select required name="gender" value={details.gender || ''} onChange={handleChange} className="input-field appearance-none">
            <option value="" className="bg-neutral-900">SELECT GENDER</option>
            <option value="Male" className="bg-neutral-900">MALE</option>
            <option value="Female" className="bg-neutral-900">FEMALE</option>
            <option value="Other" className="bg-neutral-900">OTHER</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Phone Number</label>
          <input required type="tel" name="phoneNumber" value={details.phoneNumber || ''} onChange={handleChange} className="input-field" placeholder="+00 000 000 000" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Base Location (Address)</label>
          <input required type="text" name="address" value={details.address || ''} onChange={handleChange} className="input-field" placeholder="STREET, CITY, POSTAL CODE" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Emergency Contact (Name & Signal)</label>
          <input required type="text" name="emergencyContact" value={details.emergencyContact || ''} onChange={handleChange} className="input-field" placeholder="CONTACT NAME // PHONE" />
        </div>
      </div>
      <div className="flex justify-end pt-8 border-t border-neutral-800">
        <button type="submit" className="bg-white text-black px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-xl">
          Proceed to Scan
        </button>
      </div>
    </form>
  );
};

export default Step1Details;
