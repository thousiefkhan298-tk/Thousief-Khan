import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { claimPlaceholderAccount } from '../../services/accountLinking';
import { auth, handleFirestoreError, OperationType } from '../../firebase';
import { ArrowRight, Zap, ShieldAlert } from 'lucide-react';

const SignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const trainerIdFromUrl = searchParams.get('trainerId');

  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');

  const navigate = useNavigate();

  const TRAINER_EMAIL = 'thousiefkhan298@gmail.com';
  const SECONDARY_TRAINER_EMAIL = 'speedfit029@gmail.com';

  // Handle redirect sign-in results (PWA standalone mode / mobile browser redirect)
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result || !result.user || !isMounted) return;
        setLoading(true);
        const googleUser = result.user;
        const googleEmail = googleUser.email?.toLowerCase().trim();

        if (googleEmail) {
          await claimPlaceholderAccount(googleUser.uid, googleEmail, {
            name: googleUser.displayName || googleEmail.split('@')[0],
            trainerId: trainerIdFromUrl || null,
            googleLinked: true,
          });
        }

        navigate('/dashboard');
      })
      .catch((err: any) => {
        if (isMounted) {
          handleGoogleAuthError(err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, trainerIdFromUrl]);

  const handleGoogleAuthError = (err: any) => {
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
      return;
    }
    console.warn("Google Auth Warning on Signup:", err.code || err.message);
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this site';
    if (err.code === 'auth/popup-blocked') {
      setError('Google sign-in popup was blocked. Please enable popups or use email registration.');
    } else if (err.code === 'auth/unauthorized-domain') {
      setError(`Google sign-in is not authorized for "${hostname}". Ask the app owner to add "${hostname}" to Firebase Console > Authentication > Settings > Authorized Domains.`);
    } else if (err.code === 'auth/network-request-failed') {
      setError('Network connection failed. Please check your internet connection and retry.');
    } else {
      setError('Google sign-up failed: ' + (err.message || 'Please try again.'));
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );

    try {
      let googleUser: any = null;
      try {
        const result = await signInWithPopup(auth, provider);
        googleUser = result.user;
      } catch (popupErr: any) {
        if (['auth/popup-blocked', 'auth/cancelled-popup-request'].includes(popupErr.code) || isStandalone) {
          console.log("Popup blocked on signup, using redirect...");
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }

      const googleEmail = googleUser?.email?.toLowerCase().trim();
      if (googleEmail) {
        await claimPlaceholderAccount(googleUser.uid, googleEmail, {
          name: googleUser.displayName || googleEmail.split('@')[0],
          trainerId: trainerIdFromUrl || null,
          googleLinked: true,
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      handleGoogleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const isTrainer = [TRAINER_EMAIL.toLowerCase(), SECONDARY_TRAINER_EMAIL.toLowerCase()].includes(email.toLowerCase());
      const role = isTrainer ? 'TRAINER' : 'CLIENT';
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const path = `users/${uid}`;
      
      try {
        await claimPlaceholderAccount(uid, email, {
          name: name || '',
          role,
          trainerId: trainerIdFromUrl || null,
          createdAt: new Date().toISOString()
        });
      } catch (firestoreErr: any) {
        console.error("Firestore error during signup:", firestoreErr);
        if (firestoreErr.message && firestoreErr.message.includes('Verify your email')) {
          setVerificationRequired(true);
          setError('');
          return;
        }
        handleFirestoreError(firestoreErr, OperationType.CREATE, path);
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.warn("Signup attempt rejected:", err?.code || err?.message);
      if (err.message && err.message.includes('Verify your email')) {
        setVerificationRequired(true);
        setError('');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password signup is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Firebase Authentication. Please add this domain to the "Authorized domains" list in the Firebase Console (Authentication > Settings).');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters long.');
      } else {
        // Check if it's our custom JSON error from handleFirestoreError
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error && parsed.operationType) {
            setError(`Database Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`);
            return;
          }
        } catch (e) {
          // Not a JSON error
        }
        setError(err.message || 'Failed to sign up');
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
        const isTrainer = [TRAINER_EMAIL.toLowerCase(), SECONDARY_TRAINER_EMAIL.toLowerCase()].includes(email.toLowerCase());
        const role = isTrainer ? 'TRAINER' : 'CLIENT';
        await claimPlaceholderAccount(auth.currentUser.uid, auth.currentUser.email || email, {
          name: name || '',
          role,
          trainerId: trainerIdFromUrl || null,
          createdAt: new Date().toISOString()
        });
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-start md:justify-center bg-brand-dark p-6 py-20 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50"></div>

      <div className="w-full max-w-md z-10 my-12">
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
              Join <span className="text-brand-red">Now</span>
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">New Client Registration</p>
          </div>

          {error && (
            <div role="alert" className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-2xl mb-8 text-xs font-mono flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
              <span>{error}</span>
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
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full py-4 bg-white text-neutral-900 font-bold rounded-2xl hover:bg-neutral-200 transition-all text-[10px] font-mono uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                >
                  Sign up with Google
                </button>
              </div>

              <div className="relative flex py-4 items-center mb-6">
                <div className="flex-grow border-t border-[#2A2A2A]"></div>
                <span className="flex-shrink-0 mx-4 text-white font-bold text-[9px] font-mono uppercase tracking-widest">Or Email</span>
                <div className="flex-grow border-t border-[#2A2A2A]"></div>
              </div>

              <form onSubmit={handleEmailSignup} className="space-y-5 mb-6">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-300 mb-2 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="input-field min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#E10600] focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-gray-300 mb-2 ml-1">Email address</label>
                  <input
                    type="email"
                    required
                    className="input-field min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#E10600] focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-gray-300 mb-2 ml-1">Password</label>
                  <input
                    type="password"
                    required
                    className="input-field min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#E10600] focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary group mt-4 w-full min-h-[48px] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
                >
                  <span>{loading ? 'Creating account...' : 'Create account with email'}</span>
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-center">
            <p className="text-white text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-red font-semibold hover:text-red-400 transition-colors inline-block min-h-[44px] py-2.5 px-1">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
