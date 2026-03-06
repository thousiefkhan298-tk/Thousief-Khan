
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
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
      
      <div className="relative w-full max-w-2xl bg-white p-8 rounded-3xl border border-black/5 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-black text-red-600 brand-font italic tracking-tighter">JOIN SPEED <span className="text-black">FIT</span></h1>
          <p className="text-neutral-500 mt-2">Start your transformation journey today.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black focus:border-red-600 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black focus:border-red-600 focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Phone Number</label>
            <input 
              type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-black focus:border-red-600 focus:outline-none"
              placeholder="+1 234 567 890"
            />
          </div>

          <div className="bg-black/5 p-6 rounded-xl border border-black/10 h-48 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-red-600 mb-3 uppercase tracking-wider">Speed Fit – Terms and Conditions</h3>
            <div className="text-neutral-600 text-xs leading-relaxed whitespace-pre-wrap">
              {TERMS_AND_CONDITIONS}
            </div>
          </div>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-5 h-5 rounded border-black/10 text-red-600 focus:ring-red-600 bg-black/5"
            />
            <span className="text-sm text-neutral-600 group-hover:text-black transition-colors font-medium">I Agree to follow these terms while training with Speed Fit.</span>
          </label>

          {error && (
            <p className="text-red-600 text-sm flex items-center gap-2 font-bold"><i className="fas fa-exclamation-circle"></i> {error}</p>
          )}

          <button 
            type="submit"
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-500 transition-all active:scale-95 accent-glow shadow-lg shadow-red-600/20"
          >
            Create Account
          </button>
        </form>

          <div className="mt-8 text-center">
            <p className="text-neutral-500 text-sm">
              Already registered? <button onClick={onToggleView} className="text-red-600 font-bold hover:underline">Log in here</button>
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                Privacy Policy
              </a>
              <span className="text-neutral-200">|</span>
              <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
  );
};

export default SignupPage;
