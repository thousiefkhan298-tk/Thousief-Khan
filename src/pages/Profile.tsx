import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const Profile: React.FC<{ user: any }> = ({ user }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const isDark = true;

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  return (
    <Layout userData={user}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className={`text-3xl font-display italic uppercase tracking-wider transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>User Profile</h2>
        </div>
        
        <div className={`rounded-[2.5rem] p-10 shadow-xl transition-all duration-300 border ${
          isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-8 mb-10">
            <div className="w-24 h-24 bg-brand-red rounded-[2rem] flex items-center justify-center font-display italic text-4xl shadow-[0_0_30px_rgba(255,0,0,0.3)]">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h3 className={`text-2xl font-bold uppercase tracking-wider transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'Athlete'}</h3>
              <p className="font-mono text-xs text-brand-red uppercase tracking-[0.2em]">{user?.role || 'Client'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className={`block text-[10px] font-mono uppercase tracking-widest font-bold ml-1 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-600'}`}>Email Address</label>
              <div className={`p-4 rounded-2xl border font-mono text-xs transition-all duration-300 ${
                isDark ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                {user?.email}
              </div>
            </div>
            <div className="space-y-2">
              <label className={`block text-[10px] font-mono uppercase tracking-widest font-bold ml-1 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-600'}`}>Member Since</label>
              <div className={`p-4 rounded-2xl border font-mono text-xs transition-all duration-300 ${
                isDark ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
