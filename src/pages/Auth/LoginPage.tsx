import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { claimPlaceholderAccount } from '../../services/accountLinking';
import { ArrowRight, Zap, ShieldAlert, Check, RefreshCw } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invalidCredState, setInvalidCredState] = useState(false);
  
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');
  
  const navigate = useNavigate();

  // Remember email only; passwords are never saved in local storage.
  useEffect(() => {
    const savedEmail = localStorage.getItem('speedfit_remembered_email');
    // Previous builds stored passwords here. Remove them during the upgrade.
    localStorage.removeItem('speedfit_remembered_password');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setNotice('');
    setInvalidCredState(false);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const googleEmail = googleUser.email?.toLowerCase().trim();

      if (googleEmail) {
        await claimPlaceholderAccount(googleUser.uid, googleEmail, {
          name: googleUser.displayName || googleEmail.split('@')[0],
          googleLinked: true,
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
        return;
      }
      console.warn("Google Auth Warning:", err.code || err.message);
      if (err.code === 'auth/popup-blocked') {
        setError('Google login popup was blocked. Please enable popups for this site or use standard email login.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Google sign-in is not configured for this address. Ask the app owner to add this site to Firebase Authentication authorized domains.');
      } else {
        setError('Google login failed: ' + (err.message || 'Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setInvalidCredState(false);
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await claimPlaceholderAccount(result.user.uid, result.user.email || email);
      if (rememberMe) {
        localStorage.setItem('speedfit_remembered_email', email.trim().toLowerCase());
      } else {
        localStorage.removeItem('speedfit_remembered_email');
      }
      navigate('/dashboard');
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      const isVerificationIssue = msg.includes('Verify your email');
      const isInvalidCred = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code) ||
                            msg.includes('auth/invalid-credential') ||
                            msg.includes('auth/wrong-password') ||
                            msg.includes('auth/user-not-found') ||
                            msg.includes('auth/invalid-email');

      console.warn("Login attempt not completed:", code || msg);

      if (isVerificationIssue) {
        setVerificationRequired(true);
        setError('');
      } else if (isInvalidCred) {
        setInvalidCredState(true);
        setError('Email or password was not accepted. If you haven’t created a password account yet, sign up or use Google sign-in.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/password sign-in is not enabled for this app. Please use Google sign-in.');
      } else {
        setError(msg || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setVerifying(true);
    setVerifyNotice('');
    setError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setVerifyNotice('Verification email sent! Check your inbox, follow the link, then choose Check Verification.');
    } catch (err: any) {
      setError('Could not send verification email: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setVerifying(true);
    setVerifyNotice('');
    setError('');
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        await claimPlaceholderAccount(auth.currentUser.uid, auth.currentUser.email || email);
        navigate('/dashboard');
      } else {
        setError('Email is still not verified. Please check your inbox and click the link.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification check failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelVerification = async () => {
    setVerifying(true);
    try {
      await signOut(auth);
      setVerificationRequired(false);
      setError('');
      setVerifyNotice('');
    } catch (err: any) {
      setError('Error signing out: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first, then choose Forgot password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setNotice(`If ${email.trim().toLowerCase()} has an account, a reset link was sent to your inbox.`);
      setInvalidCredState(false);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setNotice(`If ${email.trim().toLowerCase()} has an account, a reset link was sent to your inbox.`);
        setInvalidCredState(false);
      } else {
        setError('Unable to request a reset link. Check the email address and try again.');
      }
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
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white font-bold">BUILD TO TRANSFORMATION</span>
            <div className="h-[1px] flex-1 bg-brand-red/30"></div>
          </div>
        </div>

        <div className="bg-[#121214]/95 backdrop-blur-xl p-10 rounded-[2.5rem] border border-[#2A2A2A] shadow-2xl">
          <div className="mb-10 text-center">
            <h1 className="text-5xl font-display italic uppercase leading-[1.1] mb-2 text-white">
              Power <span className="text-brand-red">Up!</span>
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">Secure Portal Access</p>
          </div>

          {error && (
            <div role="alert" className="bg-red-950/30 border border-red-900/50 text-red-400 p-4 rounded-2xl mb-6 text-xs font-mono space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-white">{error}</span>
                </div>
              </div>
              {invalidCredState && (
                <div className="pt-2 border-t border-red-900/40 text-[11px] space-y-2.5">
                  <p className="text-[#A1A1AA] text-[10px] uppercase font-bold tracking-wider">Quick Recovery Options:</p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full py-2.5 px-3 bg-white text-neutral-900 font-bold rounded-xl hover:bg-neutral-200 transition-all text-[10px] font-mono uppercase tracking-wider text-center flex items-center justify-center gap-2"
                    >
                      Sign in with Google
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={loading || !email.trim()}
                        className="flex-1 py-2 px-2.5 bg-[#1a1a1e] border border-[#333] hover:border-brand-red text-white rounded-xl transition-all text-[9px] font-mono uppercase tracking-wider text-center disabled:opacity-40"
                      >
                        Reset Password
                      </button>
                      <Link
                        to={`/signup?email=${encodeURIComponent(email.trim())}`}
                        className="flex-1 py-2 px-2.5 bg-[#1a1a1e] border border-[#333] hover:border-brand-red text-white rounded-xl transition-all text-[9px] font-mono uppercase tracking-wider text-center"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {notice && (
            <div role="status" className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 p-4 rounded-2xl mb-6 text-xs font-mono">
              {notice}
            </div>
          )}

          {verificationRequired ? (
            <div className="space-y-6 text-left">
              <div className="bg-[#141417] border border-[#2A2A2A] rounded-2xl p-6 mb-4">
                <p className="text-xs text-white font-mono uppercase tracking-wider font-bold mb-3 text-brand-red">★ Action Required: Verify Email</p>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed mb-4">
                  We found a pre-registered client profile for <span className="text-white font-bold">{email}</span>!
                  To link your training history, workout plans, and diet schedule securely, please verify your email address.
                </p>
                {verifyNotice && (
                  <p role="status" className="text-[10px] font-mono text-green-400 uppercase tracking-wider mb-4 font-bold bg-green-950/20 border border-green-900/50 p-3 rounded-xl">
                    {verifyNotice}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleSendVerification}
                  className="w-full py-4 bg-brand-red text-white font-bold rounded-2xl hover:bg-red-600 transition-all text-[10px] font-mono uppercase tracking-[0.15em]"
                >
                  {verifying ? 'Please wait...' : 'Send Verification Email'}
                </button>

                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleCheckVerification}
                  className="w-full py-4 bg-white text-neutral-900 font-bold rounded-2xl hover:bg-neutral-200 transition-all text-[10px] font-mono uppercase tracking-[0.15em]"
                >
                  {verifying ? 'Please wait...' : 'I have verified / Check Status'}
                </button>

                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleCancelVerification}
                  className="w-full py-4 bg-transparent border border-[#2A2A2A] text-[#A1A1AA] hover:text-white font-bold rounded-2xl transition-all text-[10px] font-mono uppercase tracking-[0.15em]"
                >
                  Cancel & Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-4 bg-white text-neutral-900 font-bold rounded-2xl hover:bg-neutral-200 transition-all text-[10px] font-mono uppercase tracking-[0.15em] flex items-center justify-center gap-2 no-theme-override"
                >
                  Sign in with Google
                </button>
              </div>

              <div className="relative flex py-4 items-center mb-6">
                <div className="flex-grow border-t border-[#2A2A2A]"></div>
                <span className="flex-shrink-0 mx-4 text-white font-bold text-[9px] font-mono uppercase tracking-widest">Or Email</span>
                <div className="flex-grow border-t border-[#2A2A2A]"></div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-6 mb-6">
                <div className="relative">
                  <label htmlFor="login-email" className="block text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] font-bold mb-3 ml-1">Identity (Email)</label>
                  <input
                    id="login-email"
                    autoComplete="username"
                    type="email"
                    required
                    className="input-field"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (invalidCredState) setInvalidCredState(false);
                      if (error) setError('');
                    }}
                    placeholder="athlete@speedfit.com"
                  />
                </div>
                
                <div className="relative">
                  <label htmlFor="login-password" className="block text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] font-bold mb-3 ml-1">Secret (Password)</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input-field"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (invalidCredState) setInvalidCredState(false);
                      if (error) setError('');
                    }}
                    placeholder="Your password"
                  />
                </div>

                {/* Remember Me and Forgot Password Container */}
                <div className="flex items-center justify-between mt-4">
                  <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-[#E10600] border-[#FF3B30]' : 'border-[#2A2A2A] bg-[#0d0d0f] group-hover:border-[#FF3B30]'}`}>
                      {rememberMe && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] group-hover:text-white transition-colors">Remember Me</span>
                  </label>
                  
                  <button type="button" disabled={loading} onClick={handlePasswordReset} className="text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA]">Forgot password?</button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary group w-full"
                >
                  <span>{loading ? 'Processing...' : 'Login with Email'}</span>
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </>
          )}

          {/* Recovery and Gmail restoration helpful tip */}
          <div className="bg-[#0d0d0f]/60 border border-[#2A2A2A] rounded-2xl p-4 text-left mb-6">
            <p className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1AA] leading-relaxed">
              <span className="text-[#FF3B30] font-bold">★ Gmail Sign-In:</span> Use the same email your trainer registered. If an older profile cannot be linked, ask your trainer to check the account. Password recovery is available above.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-[#2A2A2A] text-center">
            <p className="text-white font-bold text-xs font-mono uppercase tracking-wider">
              New Client?{' '}
              <Link to="/signup" className="text-brand-red font-bold hover:text-red-400 transition-colors">
                Join the Ranks
              </Link>
            </p>
            
            <div className="mt-8 p-6 bg-[#141417]/50 rounded-2xl border border-[#2A2A2A]/50">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA] font-bold mb-4 italic">Installation Instructions</p>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold">iOS / Safari</p>
                  <p className="text-[8px] font-mono text-white font-bold leading-relaxed uppercase">1. Tap Share icon<br/>2. Scroll to "Add to Home Screen"</p>
                </div>
                <div className="space-y-2 border-l border-[#2A2A2A] pl-4">
                  <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold">Android / Chrome</p>
                  <p className="text-[8px] font-mono text-white font-bold leading-relaxed uppercase">1. Tap Menu (⋮)<br/>2. Tap "Install app" or "Add to Home Screen"</p>
                </div>
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>
  );
};

export default LoginPage;
