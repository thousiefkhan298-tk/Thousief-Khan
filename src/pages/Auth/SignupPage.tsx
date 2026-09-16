import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { claimPlaceholderAccount } from '../../services/accountLinking';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase.js';
import { ArrowRight, Zap } from 'lucide-react';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trainerIdFromUrl = searchParams.get('trainerId');

  const TRAINER_EMAIL = 'thousiefkhan298@gmail.com';
  const SECONDARY_TRAINER_EMAIL = 'speedfit029@gmail.com';

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
          onboardingCompleted: role === 'TRAINER',
          createdAt: new Date().toISOString()
        });
      } catch (firestoreErr: any) {
        console.error("Firestore error during signup:", firestoreErr);
        handleFirestoreError(firestoreErr, OperationType.CREATE, path);
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === 'auth/operation-not-allowed') {
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
            <div className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-2xl mb-8 text-xs font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-6 mb-6">
            <div className="relative">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] font-bold mb-3 ml-1">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] font-bold mb-3 ml-1">Identity (Email)</label>
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
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] font-bold mb-3 ml-1">Secret (Password)</label>
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
              className="btn-primary group mt-4 w-full"
            >
              <span>{loading ? 'Processing...' : 'Sign up with Email'}</span>
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#2A2A2A] text-center">
            <p className="text-white font-bold text-xs font-mono uppercase tracking-wider">
              Already Registered?{' '}
              <Link to="/login" className="text-brand-red font-bold hover:text-red-400 transition-colors">
                Access Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

