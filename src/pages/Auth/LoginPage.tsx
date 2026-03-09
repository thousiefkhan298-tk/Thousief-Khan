import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ArrowRight, Zap } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start md:justify-center bg-brand-dark p-6 py-20 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-12">
          <div className="speedfit-logo mb-2">
            <Zap className="w-10 h-10 text-brand-red mr-3 fill-current" />
            SPEED<span>FIT</span>
          </div>
          <div className="flex items-center space-x-4 w-full">
            <div className="h-[1px] flex-1 bg-brand-red/30"></div>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400">BUILD TO TRANSFORMATION</span>
            <div className="h-[1px] flex-1 bg-brand-red/30"></div>
          </div>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-neutral-800 shadow-2xl">
          <div className="mb-10">
            <h1 className="text-5xl font-display italic uppercase leading-[1.1] mb-2 text-white">
              Power <span className="text-brand-red">Up!</span>
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">Secure Portal Access</p>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-2xl mb-8 text-xs font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="relative">
              <span className="absolute -left-8 top-10 text-[10px] font-mono text-brand-red font-bold">01</span>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-3 ml-1">Identity (Email)</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@speedfit.com"
              />
            </div>
            
            <div className="relative">
              <span className="absolute -left-8 top-10 text-[10px] font-mono text-brand-red font-bold">02</span>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-3 ml-1">Secret (Password)</label>
              <input
                type="password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary group"
            >
              <span>{loading ? 'Processing...' : 'Unleash Potential'}</span>
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-neutral-800 text-center">
            <p className="text-neutral-500 text-xs font-mono uppercase tracking-wider">
              New Recruit?{' '}
              <Link to="/signup" className="text-brand-red font-bold hover:text-red-400 transition-colors">
                Join the Ranks
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
