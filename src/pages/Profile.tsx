import React from 'react';
import Layout from '../components/Layout';

const Profile: React.FC<{ user: any }> = ({ user }) => {
  return (
    <Layout userData={user}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-display italic uppercase tracking-wider text-white">User Profile</h2>
        </div>
        
        <div className="bg-neutral-900/50 rounded-[2.5rem] border border-neutral-800 p-10 shadow-xl">
          <div className="flex items-center space-x-8 mb-10">
            <div className="w-24 h-24 bg-brand-red rounded-[2rem] flex items-center justify-center font-display italic text-4xl shadow-[0_0_30px_rgba(255,0,0,0.3)]">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider">{user?.name || 'Athlete'}</h3>
              <p className="font-mono text-xs text-brand-red uppercase tracking-[0.2em]">{user?.role || 'Client'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Email Address</label>
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-white font-mono text-xs">
                {user?.email}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 ml-1">Member Since</label>
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-white font-mono text-xs">
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
