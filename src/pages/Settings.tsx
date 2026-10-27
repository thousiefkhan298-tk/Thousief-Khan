import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { notificationService } from '../services/notificationService';
import { motion } from 'motion/react';
import { Download, Laptop, Smartphone, FileArchive, Globe, ArrowLeft } from 'lucide-react';

const Settings: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const getSharedUrl = () => {
    if (typeof window === 'undefined') return "https://ais-pre-fviwvcuvuktbwhm63injwf-146940753580.asia-southeast1.run.app";
    let origin = window.location.origin;
    if (origin.includes('-dev-')) {
      origin = origin.replace('-dev-', '-pre-');
    }
    return origin;
  };
  const sharedAppUrl = getSharedUrl();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      return window.Notification.permission;
    }
    return 'default';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const [themeMode, setThemeMode] = useState<'red-and-black' | 'monochrome'>(() => {
    return (localStorage.getItem('theme-mode') as 'red-and-black' | 'monochrome') || 'red-and-black';
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isDark = true;

  useEffect(() => {
    const handleBeforeInstallprompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallprompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallprompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        "How to download and install Speed Fit on your device:\n\n" +
        "📱 For Mobile (iOS Safari):\n" +
        "1. Tap the Share button at the bottom of the screen.\n" +
        "2. Scroll down and click 'Add to Home Screen'.\n\n" +
        "🤖 For Mobile (Android / Chrome):\n" +
        "1. Tap the three dots menu in Chrome.\n" +
        "2. Select 'Add to Home screen' or 'Install App'.\n\n" +
        "💻 For Desktop (Chrome / Edge):\n" +
        "1. Look at the address bar in your browser.\n" +
        "2. Click the install icon (usually in the right corner) to run it as a native desktop application."
      );
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('theme-changed'));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme-mode', themeMode);
    window.dispatchEvent(new Event('theme-changed'));
  }, [themeMode]);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      setNotificationPermission(window.Notification.permission);
    }
    if (granted) {
      notificationService.sendLocalNotification('Notifications Enabled!', {
        body: 'You will now receive mission updates and reminders.'
      });
    }
  };

  const handleTestNotification = () => {
    notificationService.sendLocalNotification('Speed Fit Alert', {
      body: 'This is a test notification. Systems are operational.'
    });
  };

  return (
    <Layout userData={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(user?.role === 'TRAINER' ? '/dashboard?tab=dashboard' : '/dashboard?tab=home');
                }
              }}
              aria-label="Go back"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors min-h-[44px] py-2 px-1 focus-visible:ring-2 focus-visible:ring-brand-red focus:outline-none rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 text-brand-red" />
              <span>Back</span>
            </button>
            <h2 className={`text-2xl sm:text-3xl font-display uppercase tracking-wider transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Settings
            </h2>
          </div>
        </div>
        
        <div className={`rounded-[2.5rem] p-10 shadow-xl transition-all duration-300 border ${
          isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-10">
            <section className="space-y-6">
              <h3 className="text-lg font-display italic uppercase tracking-wider text-brand-red">Preferences</h3>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 ${
                  isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Push Notifications</p>
                    <p className={`text-[10px] font-mono uppercase ${isDark ? 'text-white font-bold' : 'text-slate-500 font-semibold'}`}>Receive alerts on your device</p>
                  </div>
                  <div 
                    onClick={handleRequestPermission}
                    className={`w-12 h-6 ${notificationPermission === 'granted' ? 'bg-brand-red' : 'bg-neutral-850'} rounded-full relative cursor-pointer transition-colors`}
                  >
                    <div className={`absolute ${notificationPermission === 'granted' ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full transition-all`}></div>
                  </div>
                </div>
                {notificationPermission === 'granted' && (
                  <button 
                    onClick={handleTestNotification}
                    className={`w-full p-4 rounded-3xl border text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${
                      isDark 
                        ? 'bg-neutral-950 border-neutral-700 text-neutral-50 hover:border-brand-red hover:text-brand-red' 
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-brand-red hover:text-brand-red'
                    }`}
                  >
                    Trigger Test Alert
                  </button>
                )}
                <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 ${
                  isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Email Notifications</p>
                    <p className={`text-[10px] font-mono uppercase ${isDark ? 'text-white font-bold' : 'text-slate-500 font-semibold'}`}>Receive mission updates via email</p>
                  </div>
                  <div className="w-12 h-6 bg-neutral-800 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-neutral-600 rounded-full"></div>
                  </div>
                </div>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border gap-4 transition-all duration-300 ${
                  isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>System Design Accent Theme</p>
                    <p className={`text-[10px] font-mono uppercase ${isDark ? 'text-white font-bold' : 'text-slate-500 font-semibold'}`}>
                      {themeMode === 'monochrome' ? 'using High-Contrast Black & White theme' : 'using Elite Black & Red theme'}
                    </p>
                  </div>
                  
                  <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-2xl self-start sm:self-auto">
                    <button
                      onClick={() => setThemeMode('red-and-black')}
                      className={`px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all ${
                        themeMode === 'red-and-black'
                          ? 'bg-brand-red text-white shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                    >
                      Black & Red
                    </button>
                    <button
                      onClick={() => setThemeMode('monochrome')}
                      className={`px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all ${
                        themeMode === 'monochrome'
                          ? 'bg-white text-black shadow-md font-black'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                    >
                      Black & White
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-lg font-display italic uppercase tracking-wider text-brand-red">App Installation & Source Downloads</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Channel 1: Mobile Quick Launch QR Code */}
                <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center sm:items-start gap-6 transition-all duration-300 ${
                  isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="bg-white p-3 rounded-2xl flex items-center justify-center shrink-0">
                    <QRCodeDisplay url={sharedAppUrl} />
                  </div>
                  <div className="space-y-3 text-center sm:text-left">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Scan & Sync App</p>
                      <p className={`text-[9px] font-mono uppercase mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Instant Mobile Deployment</p>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                      Scan this secure QR code using your phone's camera to run Speed Fit natively on your smartphone immediately.
                    </p>
                    <a 
                      href={sharedAppUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 text-brand-red text-[10px] font-mono uppercase tracking-wider font-bold hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" /> Launch Live URL
                    </a>
                  </div>
                </div>

                {/* Channel 2: Download Standalone App Client */}
                <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 transition-all duration-300 ${
                  isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-brand-red" />
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Install Standalone App</p>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                      Install Speed Fit as a native app on your mobile home screen or computer dashboard. This offers offline storage support, quick launched full-screen views, and premium responsiveness.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleInstallApp}
                    className="w-full py-3.5 bg-brand-red hover:bg-neutral-100 text-white hover:text-black font-mono text-[10px] uppercase font-heavy tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,0,0.15)]"
                  >
                    <Download className="w-3.5 h-3.5" /> Get Standalone App
                  </button>
                </div>

                {/* Channel 3: Download Complete Source Code Bundle */}
                <div className={`p-6 rounded-3xl border md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all duration-300 ${
                  isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-brand-red" />
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Export Full Source Code (.ZIP)</p>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                      You can instantly download the entire Speed Fit React & Tailwind source code to edit or run locally. Simply open the <strong className="text-white">Settings</strong> menu in the upper corner of your Google AI Studio workspace and click <strong className="text-white">Export to ZIP</strong> or <strong className="text-white">Export to GitHub</strong>.
                    </p>
                  </div>

                  <a
                    href="https://ai.studio/build"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 bg-neutral-900 border border-neutral-800 hover:border-brand-red/30 hover:bg-neutral-850 text-neutral-300 hover:text-white font-mono text-[10px] uppercase font-bold tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Direct Workspace Export
                  </a>
                </div>

                {/* Highly Informative Client Deployment Guide */}
                <div className="md:col-span-2 p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1 px-2.5 bg-amber-500/20 text-amber-400 font-mono text-[9px] uppercase tracking-widest font-black rounded-lg">CRITICAL GUIDE</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">How to Share with Clients (No Builder Wrappers or Warnings)</h4>
                  </div>
                  <p className="text-[10px] text-neutral-300 font-sans leading-relaxed">
                    If you share the <strong className="text-amber-300">Google AI Studio builder link</strong> (the URL with <code className="text-white px-1 py-0.5 bg-neutral-900 rounded">aistudio.google.com</code> at the start) with your clients, they will see the development sidebars, live chats, and an <code className="text-white">"unsafe application"</code> warning bar.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 space-y-1">
                      <p className="text-[9px] font-mono text-brand-red uppercase tracking-wider font-extrabold">🚨 DO NOT SEND</p>
                      <p className="text-[10px] font-mono font-bold text-neutral-500 break-all select-all">
                        https://aistudio.google.com/build/...
                      </p>
                      <p className="text-[9px] text-neutral-400">Loads developer panels and preview frames on mobile devices.</p>
                    </div>
                    <div className="p-4 bg-neutral-950/60 rounded-2xl border border-emerald-500/20 space-y-1">
                      <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-extrabold">✅ SHARE THIS CLEAN LINK</p>
                      <p className="text-[10px] font-mono font-bold text-emerald-200 break-all select-all">
                        {sharedAppUrl}
                      </p>
                      <p className="text-[9px] text-neutral-300">Opens the direct standalone app beautifully on any screen or phone browser.</p>
                    </div>
                  </div>
                  <div className="text-[9.5px] text-neutral-400 leading-relaxed pt-1">
                    💡 <strong>Pro Tip:</strong> Place your finger on the green link above to copy it, then send it directly via WhatsApp, Email, or text to your clients! Alternatively, you can permanently white-label and host your application on your own web domain by exporting the ZIP archive.
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-lg font-display italic uppercase tracking-wider text-brand-red">Security</h3>
              <button className={`w-full p-6 rounded-3xl border text-left hover:border-brand-red transition-all group ${
                isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-xs font-bold uppercase tracking-wider group-hover:text-brand-red transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>Change Access Credentials</p>
                <p className={`text-[10px] font-mono uppercase ${isDark ? 'text-white font-bold' : 'text-slate-500 font-semibold'}`}>Update your password and security keys</p>
              </button>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
