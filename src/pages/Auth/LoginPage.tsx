import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { ArrowRight, Zap, ShieldAlert, Sparkles, Check } from 'lucide-react';
import QRCodeDisplay from '../../components/QRCodeDisplay';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load remembered credentials if present
  useEffect(() => {
    const savedEmail = localStorage.getItem('speedfit_remembered_email');
    const savedPassword = localStorage.getItem('speedfit_remembered_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const googleEmail = googleUser.email?.toLowerCase().trim();

      if (googleEmail) {
        // Look up if a user already exists with this email address in our users collection
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', googleEmail));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const matchedDoc = querySnap.docs[0];
          const matchedUID = matchedDoc.id;

          // If the matching document's ID is different from the Google User's UID,
          // we should clone/migrate this user's data to the new Google User's UID so they keep their data!
          if (matchedUID !== googleUser.uid) {
            console.log(`Migrating existing user data for ${googleEmail} from old ID ${matchedUID} to Google UID ${googleUser.uid}...`);
            const userData = matchedDoc.data();

            // Create/update the new Google UID doc in users with existing user data
            await setDoc(doc(db, 'users', googleUser.uid), {
              ...userData,
              uid: googleUser.uid,
              id: googleUser.uid,
              googleLinked: true
            });

            // Seamlessly migrate all reference ID collections to keep the history!
            const collectionsToMigrate = [
              'workoutLogs',
              'trainerNotes',
              'workoutPlans',
              'attendance',
              'rescheduleRequests',
              'sessions',
              'dietPlans',
              'pendingDrafts',
              'paymentRecords',
              'progressPhotos',
              'scheduledWorkouts'
            ];

            for (const colName of collectionsToMigrate) {
              try {
                const subQ = query(collection(db, colName), where('clientId', '==', matchedUID));
                const subSnap = await getDocs(subQ);
                for (const subDoc of subSnap.docs) {
                  await updateDoc(subDoc.ref, { clientId: googleUser.uid });
                }
              } catch (e) {
                console.warn(`Error migrating subcollection ${colName}:`, e);
              }
            }

            // Also search for favorites if any exist
            try {
              const favQ = query(collection(db, 'favorites'), where('uid', '==', matchedUID));
              const favSnap = await getDocs(favQ);
              for (const favDoc of favSnap.docs) {
                await updateDoc(favDoc.ref, { uid: googleUser.uid });
              }
            } catch (e) {
              console.warn("Error migrating favorites:", e);
            }

            // Flag the old record as migrated so it doesn't duplicate
            await updateDoc(matchedDoc.ref, {
              isMigrated: true,
              migratedTo: googleUser.uid
            });
          } else {
            // Already matches, just make sure googleLinked is true
            await updateDoc(doc(db, 'users', googleUser.uid), {
              googleLinked: true
            });
          }
        } else {
          // If no user exists yet in Firestore for this Google account, we can provision a basic client role document
          await setDoc(doc(db, 'users', googleUser.uid), {
            uid: googleUser.uid,
            id: googleUser.uid,
            name: googleUser.displayName || googleEmail.split('@')[0],
            email: googleEmail,
            role: 'CLIENT',
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            googleLinked: true
          });
        }
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('Google login popup was blocked. Please enable popups for this site or use standard email login.');
      } else {
        setError('Google login failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let autoLoggedIn = false;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Save credentials if Remember Me is active
      if (rememberMe) {
        localStorage.setItem('speedfit_remembered_email', email);
        localStorage.setItem('speedfit_remembered_password', password);
      } else {
        localStorage.removeItem('speedfit_remembered_email');
        localStorage.removeItem('speedfit_remembered_password');
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Check if client exists in Firestore but hasn't joined Firebase Auth yet
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        try {
          console.log("Checking if athlete exists in Firestore but has not joined Firebase Auth yet...");
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            const userDocSnap = querySnap.docs[0];
            const userData = userDocSnap.data();
            
            const storedPassword = userData.password || userData.assignedPassword;
            if (storedPassword && String(storedPassword).trim() === password.trim()) {
              console.log("Match found in database! Creating Firebase Auth credential for client...");
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              const uid = userCredential.user.uid;
              
              // create document at users/uid
              await setDoc(doc(db, 'users', uid), {
                ...userData,
                uid: uid,
                id: uid,
                onboardingCompleted: userData.onboardingCompleted !== undefined ? userData.onboardingCompleted : false
              });
              
              if (userDocSnap.id !== uid) {
                // Migrate all trainer-defined records and activities seamlessly to the final UID
                const collectionsToMigrate = [
                  'workoutLogs',
                  'trainerNotes',
                  'workoutPlans',
                  'attendance',
                  'rescheduleRequests',
                  'sessions',
                  'dietPlans',
                  'pendingDrafts',
                  'paymentRecords',
                  'progressPhotos',
                  'scheduledWorkouts'
                ];

                for (const colName of collectionsToMigrate) {
                  try {
                    const subQ = query(collection(db, colName), where('clientId', '==', userDocSnap.id));
                    const subSnap = await getDocs(subQ);
                    for (const subDoc of subSnap.docs) {
                      await updateDoc(subDoc.ref, { clientId: uid });
                    }
                  } catch (e) {
                    console.warn(`Error migrating subcollection ${colName}:`, e);
                  }
                }

                // Handle favorites
                try {
                  const favQ = query(collection(db, 'favorites'), where('uid', '==', userDocSnap.id));
                  const favSnap = await getDocs(favQ);
                  for (const favDoc of favSnap.docs) {
                    await updateDoc(favDoc.ref, { uid: uid });
                  }
                } catch (e) {
                  console.warn("Error migrating favorites:", e);
                }

                // Mark the temporary doc with a migration pointer and hide it from listings
                await updateDoc(userDocSnap.ref, {
                  isMigrated: true,
                  migratedTo: uid
                });
              }
              
              console.log("Client registration auto-completed! Logging in...");
              autoLoggedIn = true;

              // Save credentials if Remember Me is active
              if (rememberMe) {
                localStorage.setItem('speedfit_remembered_email', email);
                localStorage.setItem('speedfit_remembered_password', password);
              } else {
                localStorage.removeItem('speedfit_remembered_email');
                localStorage.removeItem('speedfit_remembered_password');
              }

              navigate('/dashboard');
              return;
            }
          }
        } catch (fallbackErr) {
          console.error("Auto registration fallback failed:", fallbackErr);
        }
      }

      if (!autoLoggedIn) {
        if (err.code === 'auth/operation-not-allowed') {
          setError('Email/Password login is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
        } else if (err.code === 'auth/unauthorized-domain') {
          setError('This domain is not authorized for Firebase Authentication. Please add this domain to the "Authorized domains" list in the Firebase Console (Authentication > Settings).');
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError('Invalid credentials.');
        } else {
          setError(err.message || 'Failed to login');
        }
      }
    } finally {
      if (!autoLoggedIn) {
        setLoading(false);
      }
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
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-50 font-bold">BUILD TO TRANSFORMATION</span>
            <div className="h-[1px] flex-1 bg-brand-red/30"></div>
          </div>
        </div>

        <div className="bg-neutral-800/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-neutral-700 shadow-2xl">
          <div className="mb-10 text-center">
            <h1 className="text-5xl font-display italic uppercase leading-[1.1] mb-2 text-white">
              Power <span className="text-brand-red">Up!</span>
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-50 font-bold">Secure Portal Access</p>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-2xl mb-8 text-xs font-mono flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white text-neutral-900 font-bold rounded-2xl mb-6 hover:bg-neutral-200 transition-all text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : 'Login with Google'}
          </button>

          <div className="relative flex py-4 items-center mb-6">
            <div className="flex-grow border-t border-neutral-700"></div>
            <span className="flex-shrink-0 mx-4 text-white font-bold text-[9px] font-mono uppercase tracking-widest">Or Email</span>
            <div className="flex-grow border-t border-neutral-700"></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-6 mb-6">
            <div className="relative">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-50 font-bold mb-3 ml-1">Identity (Email)</label>
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
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-50 font-bold mb-3 ml-1">Secret (Password)</label>
              <input
                type="password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* Remember Me and Forgot Password Container */}
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-[#E10600] border-[#FF3B30]' : 'border-neutral-700 bg-neutral-900 group-hover:border-[#FF3B30]'}`}>
                  {rememberMe && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 group-hover:text-white transition-colors">Remember Me</span>
              </label>
              
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 hover:text-[#FF3B30] transition-colors"
              >
                Forgot Password?
              </button>
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

          {/* Recovery and Gmail restoration helpful tip */}
          <div className="bg-neutral-900/40 border border-[#2A2A2A] rounded-2xl p-4 text-left mb-6">
            <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 leading-relaxed">
              <span className="text-[#FF3B30] font-bold">★ Gmail Sign-In:</span> If you forgot your password, authenticate via Google. Speed Fit auto-matches your Gmail address and instantly retrieves all client profiles, diet schedules, and workout histories securely.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-neutral-700 text-center">
            <p className="text-white font-bold text-xs font-mono uppercase tracking-wider">
              New Client?{' '}
              <Link to="/signup" className="text-brand-red font-bold hover:text-red-400 transition-colors">
                Join the Ranks
              </Link>
            </p>
            
            <div className="mt-8 p-6 bg-neutral-800/30 rounded-2xl border border-neutral-700/50">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-50 font-bold mb-4 italic">Installation Instructions</p>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold">iOS / Safari</p>
                  <p className="text-[8px] font-mono text-white font-bold leading-relaxed uppercase">1. Tap Share icon<br/>2. Scroll to "Add to Home Screen"</p>
                </div>
                <div className="space-y-2 border-l border-neutral-700 pl-4">
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

