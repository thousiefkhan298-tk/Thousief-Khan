
import React, { useState, useEffect } from 'react';
import { store } from '../../store';
import { Database, Shield, Check, AlertCircle, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const DatabaseSetup: React.FC = () => {
  const [config, setConfig] = useState({
    projectId: '',
    clientEmail: '',
    privateKey: ''
  });
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });
  const [currentConfig, setCurrentConfig] = useState<{ projectId: string; clientEmail: string; hasKey: boolean; isConnected?: boolean } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await store.getConfig();
      setCurrentConfig(data);
      if (data.projectId) {
        setConfig(prev => ({ ...prev, projectId: data.projectId, clientEmail: data.clientEmail }));
      }
    } catch (err) {
      console.error('Failed to fetch config');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Saving configuration...' });

    try {
      await store.saveConfig(config);
      setStatus({ type: 'success', message: 'Configuration saved successfully! Restarting server...' });
      fetchConfig();
      // Optional: reload page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save configuration. Please try again.' });
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center">
          <Database className="w-6 h-6 text-lime-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cloud Database Setup</h1>
          <p className="text-neutral-400 text-sm">Configure your Firebase Firestore connection</p>
        </div>
      </div>

      {currentConfig?.projectId && (
        <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 ${currentConfig.isConnected ? 'bg-lime-500/5 border-lime-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          {currentConfig.isConnected ? (
            <Check className="w-5 h-5 text-lime-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-medium ${currentConfig.isConnected ? 'text-lime-500' : 'text-red-500'}`}>
              {currentConfig.isConnected ? 'Connected to Cloud' : 'Connection Failed'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Project: <span className="text-white">{currentConfig.projectId}</span>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Project ID</label>
            <input
              type="text"
              value={config.projectId}
              onChange={e => setConfig({ ...config, projectId: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-lime-500 transition-colors"
              placeholder="e.g. speed-fit-b273a"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Client Email</label>
            <input
              type="email"
              value={config.clientEmail}
              onChange={e => setConfig({ ...config, clientEmail: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-lime-500 transition-colors"
              placeholder="firebase-adminsdk-..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Private Key</label>
            <textarea
              value={config.privateKey}
              onChange={e => setConfig({ ...config, privateKey: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-lime-500 transition-colors h-48 font-mono text-xs"
              placeholder="-----BEGIN PRIVATE KEY-----\n..."
              required
            />
            <p className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Your key is stored securely on the server and never exposed to the client.
            </p>
          </div>
        </div>

        {status.message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              status.type === 'success' ? 'bg-lime-500/10 text-lime-500' : 
              status.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
            }`}
          >
            {status.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
             status.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{status.message}</span>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={status.type === 'loading'}
          className="w-full bg-lime-500 text-black font-bold py-4 rounded-xl hover:bg-lime-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {status.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Configuration
        </button>
      </form>

      <div className="mt-12 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-lime-500" />
          Important Note
        </h3>
        <ul className="space-y-3 text-sm text-neutral-400">
          <li>• Ensure your Firestore is in <b>Test Mode</b> or has correct rules.</li>
          <li>• The Private Key must include the <b>\n</b> characters for line breaks.</li>
          <li>• After saving, the app will attempt to reconnect to the cloud database.</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabaseSetup;
