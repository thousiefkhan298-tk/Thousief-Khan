
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TRAINER_EMAIL } from '../../constants';
import { User, UserRole } from '../../types';
import { store } from '../../store';
import Logo from '../../components/Logo';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onToggleView: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onToggleView }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Normalize email for comparison
    const inputEmail = email.trim().toLowerCase();

    if (inputEmail === TRAINER_EMAIL.toLowerCase()) {
      // Trainer login triggered by specific email
      const trainer: User = { 
        id: 'admin-1', 
        email: TRAINER_EMAIL, 
        role: UserRole.TRAINER, 
        onboardingCompleted: true, 
        name: 'Head Trainer' 
      };
      onLoginSuccess(trainer);
    } else {
      // Client login logic: Match email and phone from store
      try {
        const allClients = await store.getAllClients();
        const inputPhone = phone.replace(/\D/g, '');
        const client = allClients.find(c => 
          c.email.toLowerCase() === inputEmail && 
          c.phoneNumber.replace(/\D/g, '') === inputPhone
        );
        
        if (client) {
          onLoginSuccess(client);
        } else {
          setError('Invalid email or phone number combination.');
        }
      } catch (err) {
        setError('Failed to connect to server. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80')] bg-cover bg-center relative overflow-hidden">
      {/* Animated Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white/90 to-red-600/10 backdrop-blur-[2px]"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-12 transform -skew-x-12">
          <div className="flex justify-center mb-4">
            <Logo size={80} className="drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
          </div>
          <h1 className="text-6xl font-black text-black brand-font italic tracking-tighter leading-none">
            SPEED <span className="text-red-600">FIT</span>
          </h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="h-[1px] w-8 bg-red-600/50"></div>
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em]">Build to Transform</p>
            <div className="h-[1px] w-8 bg-red-600/50"></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-black/5 shadow-[0_0_50px_-12px_rgba(220,38,38,0.15)]">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-black tracking-tighter uppercase italic">Power <span className="text-red-600">Up!</span></h2>
            <p className="text-neutral-500 text-xs mt-1 uppercase tracking-widest font-bold">Secure Portal Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="group relative">
              <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-600/20 group-focus-within:text-red-600 transition-colors">01</span>
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2 ml-1">Identity (Email)</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/5 border border-black/10 rounded-2xl px-5 py-4 text-black focus:outline-none focus:border-red-600/50 focus:bg-black/10 transition-all placeholder:text-neutral-400"
                placeholder="athlete@speedfit.com"
              />
            </div>

            <div className="group relative">
              <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-600/20 group-focus-within:text-red-600 transition-colors">02</span>
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2 ml-1">Secret (Phone)</label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/5 border border-black/10 rounded-2xl px-5 py-4 text-black focus:outline-none focus:border-red-600/50 focus:bg-black/10 transition-all placeholder:text-neutral-400"
                placeholder="+1 ••• ••• ••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-600 text-[11px] font-bold flex items-center space-x-3 animate-shake">
                <i className="fas fa-shield-alt"></i>
                <span className="uppercase tracking-wider">{error}</span>
              </div>
            )}

            <button 
              type="submit"
              className="group relative w-full overflow-hidden rounded-2xl bg-red-600 p-5 transition-all hover:bg-red-500 active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-center justify-center gap-3 text-white font-black uppercase tracking-[0.15em]">
                <span>Unleash Potential</span>
                <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={onToggleView} 
              className="text-neutral-500 text-[11px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
            >
              New Athlete? <span className="text-black border-b border-red-600/50 pb-0.5">Apply for Membership</span>
            </button>
          </div>

          {/* QR Code for Demo */}
          <div className="mt-12 pt-8 border-t border-black/5 text-center">
            <div className="inline-block relative group">
              <div className="absolute -inset-4 bg-red-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-3 bg-white rounded-2xl shadow-2xl border border-black/5">
                <QRCodeSVG 
                  value={appUrl}
                  size={96}
                  level="H"
                  includeMargin={false}
                  className="opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] mt-6">
              Scan to <span className="text-red-600/50">Install</span> App
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-neutral-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                Privacy Policy
              </a>
              <span className="text-neutral-300">|</span>
              <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-neutral-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
