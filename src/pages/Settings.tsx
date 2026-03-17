import React from 'react';
import Layout from '../components/Layout';
import QRCodeDisplay from '../components/QRCodeDisplay';

const Settings: React.FC<{ user: any }> = ({ user }) => {
  const sharedAppUrl = "https://ais-pre-fviwvcuvuktbwhm63injwf-146940753580.asia-southeast1.run.app";

  return (
    <Layout userData={user}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-display italic uppercase tracking-wider text-white">System Settings</h2>
        </div>
        
        <div className="bg-neutral-900/50 rounded-[2.5rem] border border-neutral-800 p-10 shadow-xl">
          <div className="space-y-10">
            <section className="space-y-6">
              <h3 className="text-lg font-display italic uppercase tracking-wider text-brand-red">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-neutral-950 rounded-3xl border border-neutral-800">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Email Notifications</p>
                    <p className="text-[10px] font-mono text-neutral-500 uppercase">Receive mission updates via email</p>
                  </div>
                  <div className="w-12 h-6 bg-neutral-800 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-neutral-600 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 bg-neutral-950 rounded-3xl border border-neutral-800">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Dark Mode</p>
                    <p className="text-[10px] font-mono text-neutral-500 uppercase">Always active for maximum focus</p>
                  </div>
                  <div className="w-12 h-6 bg-brand-red rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-lg font-display italic uppercase tracking-wider text-brand-red">Access</h3>
              <div className="p-6 bg-neutral-950 rounded-3xl border border-neutral-800 flex items-center space-x-6">
                <QRCodeDisplay url={sharedAppUrl} />
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Download App</p>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Scan to access the app on mobile</p>
                  <a href={sharedAppUrl} target="_blank" rel="noopener noreferrer" className="text-brand-red text-[10px] font-mono uppercase tracking-widest hover:underline mt-2 block">Open in Browser</a>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-lg font-display italic uppercase tracking-wider text-brand-red">Security</h3>
              <button className="w-full p-6 bg-neutral-950 rounded-3xl border border-neutral-800 text-left hover:border-brand-red transition-all group">
                <p className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-brand-red transition-colors">Change Access Credentials</p>
                <p className="text-[10px] font-mono text-neutral-500 uppercase">Update your password and security keys</p>
              </button>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
