
import React, { useState } from 'react';
import { TERMS_AND_CONDITIONS } from '../../constants';
import { User, UserRole } from '../../types';
import { store } from '../../store';
import Logo from '../../components/Logo';

interface SignupPageProps {
  onSignupSuccess: (user: User) => void;
  onToggleView: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess, onToggleView }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('You must accept the terms and conditions to proceed.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, ''); // Keep only digits for consistency

    const newUser: User = {
      id: Date.now().toString(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      name: name.trim(),
      role: UserRole.CLIENT,
      onboardingCompleted: false
    };

    try {
      await store.saveUser(newUser);
      onSignupSuccess(newUser);
    } catch (err) {
      setError('Failed to create account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      
      <div className="relative w-full max-w-2xl bg-neutral-900/95 p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-black text-lime-500 brand-font italic tracking-tighter">JOIN SPEED FIT</h1>
          <p className="text-neutral-400 mt-2">Start your transformation journey today.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-lime-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-lime-500"
                  placeholder="john@example.com"
                />
              </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Phone Number</label>
            <input 
              type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-lime-500"
              placeholder="+1 234 567 890"
            />
          </div>

          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 h-48 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-lime-500 mb-3 uppercase tracking-wider">Speed Fit – Terms and Conditions</h3>
            <div className="text-neutral-400 text-xs leading-relaxed whitespace-pre-wrap">
              {TERMS_AND_CONDITIONS}
            </div>
          </div>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-700 text-lime-500 focus:ring-lime-500 bg-neutral-800"
            />
            <span className="text-sm text-neutral-300 group-hover:text-white transition-colors font-medium">I Agree to follow these terms while training with Speed Fit.</span>
          </label>

          {error && (
            <p className="text-red-500 text-sm flex items-center gap-2"><i className="fas fa-exclamation-circle"></i> {error}</p>
          )}

          <button 
            type="submit"
            className="w-full bg-lime-500 text-black py-4 rounded-xl font-bold text-lg hover:bg-lime-400 transition-all active:scale-95 accent-glow"
          >
            Create Account
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-sm">
            Already registered? <button onClick={onToggleView} className="text-lime-500 font-bold hover:underline">Log in here</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
