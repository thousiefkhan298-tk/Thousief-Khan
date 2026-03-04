
import React, { useState } from 'react';
import { User, ClientDetails, HealthAssessment, FitnessAssessment } from '../../types';
import { HEALTH_CONDITIONS, FITNESS_GOALS, PAIN_ACTIVITIES } from '../../constants';
import { store } from '../../store';

interface OnboardingFlowProps {
  user: User;
  onComplete: (updatedName: string) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Step 1: Details
  const [details, setDetails] = useState<ClientDetails>({
    fullName: user.name || '',
    age: '',
    dob: '',
    gender: '',
    phoneNumber: user.phoneNumber || '',
    email: user.email,
    address: '',
    emergencyContact: ''
  });

  // Step 2: Health
  const [health, setHealth] = useState<HealthAssessment>({
    conditions: [],
    otherConditions: '',
    smoking: false,
    alcohol: false,
    stress: 'Moderate',
    occupation: 'Sedentary',
    sleepHours: '',
    currentlyActive: false,
    pastExperience: '',
    trainingDaysPerWeek: '',
    goals: [],
    height: '',
    weight: '',
    waist: '',
    bloodPressure: '',
    painActivities: [],
    medications: '',
    confirmed: false
  });

  // Step 3: Fitness
  const [fitness, setFitness] = useState<FitnessAssessment>({
    name: user.name || '',
    date: new Date().toISOString().split('T')[0],
    dob: '',
    gender: '',
    height: '',
    weight: '',
    skinFold: {
      triceps: '',
      chest: '',
      midAxillary: '',
      subScapular: '',
      abdomen: '',
      supraIliac: '',
      thigh: ''
    },
    postureAnalysis: '',
    movementScreen: '',
    stepTestBpm: '',
    performanceTest: '',
    pushUps: ''
  });

  const nextStep = async () => {
    if (step < 3) setStep(step + 1);
    else {
      setSubmitting(true);
      try {
        await Promise.all([
          store.saveClientDetails(user.id, details),
          store.saveHealthAssessment(user.id, health),
          store.saveFitnessAssessment(user.id, fitness)
        ]);
        onComplete(details.fullName);
      } catch (err) {
        alert('Failed to save data. Please try again.');
        setSubmitting(false);
      }
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-lime-500 mb-6">1. CLIENT DETAILS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Full Name</label>
          <input 
            type="text" value={details.fullName} onChange={(e) => setDetails({...details, fullName: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500" required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Age</label>
            <input 
              type="number" value={details.age} onChange={(e) => setDetails({...details, age: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500" required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Gender</label>
            <select 
              value={details.gender} onChange={(e) => setDetails({...details, gender: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500 appearance-none" required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Date of Birth</label>
          <input 
            type="date" value={details.dob} onChange={(e) => setDetails({...details, dob: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500" required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Emergency Contact</label>
          <input 
            type="text" value={details.emergencyContact} onChange={(e) => setDetails({...details, emergencyContact: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500" required
            placeholder="Name & Number"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Address</label>
          <textarea 
            value={details.address} onChange={(e) => setDetails({...details, address: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500" required rows={2}
          ></textarea>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-lime-500 mb-6">2. HEALTH ASSESSMENT</h2>
      
      <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Medical Conditions</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {HEALTH_CONDITIONS.map(cond => (
            <label key={cond} className="flex items-center space-x-3 text-sm text-neutral-300">
              <input 
                type="checkbox" checked={health.conditions.includes(cond)}
                onChange={(e) => {
                  if (e.target.checked) setHealth({...health, conditions: [...health.conditions, cond]});
                  else setHealth({...health, conditions: health.conditions.filter(c => c !== cond)});
                }}
                className="w-4 h-4 rounded text-lime-500 bg-neutral-800 border-neutral-700"
              />
              <span>{cond}</span>
            </label>
          ))}
        </div>
        <input 
          type="text" value={health.otherConditions} onChange={(e) => setHealth({...health, otherConditions: e.target.value})}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 mt-4 text-sm" placeholder="Other medical issues..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Smoking</label>
          <select 
            value={health.smoking ? 'Yes' : 'No'} onChange={(e) => setHealth({...health, smoking: e.target.value === 'Yes'})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Sleep (Hours/Day)</label>
          <input 
            type="number" value={health.sleepHours} onChange={(e) => setHealth({...health, sleepHours: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Stress Level</label>
          <select 
            value={health.stress} onChange={(e) => setHealth({...health, stress: e.target.value as any})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
          >
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Measurements & Goals</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Height (cm)" value={health.height} onChange={(e) => setHealth({...health, height: e.target.value})} className="bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3" />
          <input type="text" placeholder="Current Weight (kg)" value={health.weight} onChange={(e) => setHealth({...health, weight: e.target.value})} className="bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3" />
          <input type="text" placeholder="Waist (cm)" value={health.waist} onChange={(e) => setHealth({...health, waist: e.target.value})} className="bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3" />
          <input type="text" placeholder="Blood Pressure" value={health.bloodPressure} onChange={(e) => setHealth({...health, bloodPressure: e.target.value})} className="bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-700/50">
          <div>
            <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Target Weight (kg)</label>
            <input 
              type="number" 
              value={health.targetWeight || ''} 
              onChange={(e) => setHealth({...health, targetWeight: e.target.value})} 
              className="w-full bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500"
              placeholder="e.g. 75"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Target Date</label>
            <input 
              type="date" 
              value={health.targetDate || ''} 
              onChange={(e) => setHealth({...health, targetDate: e.target.value})} 
              className="w-full bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3 focus:border-lime-500"
            />
          </div>
        </div>
      </div>

      <label className="flex items-center space-x-3 p-4 bg-lime-500/10 border border-lime-500/30 rounded-xl cursor-pointer">
        <input 
          type="checkbox" checked={health.confirmed} onChange={(e) => setHealth({...health, confirmed: e.target.checked})}
          className="w-5 h-5 rounded text-lime-500 bg-neutral-800"
        />
        <span className="text-sm font-medium">I confirm that the information is true and complete.</span>
      </label>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-lime-500 mb-6">3. FITNESS ASSESSMENT</h2>
      
      <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Body Fat Measurements (Skin Fold)</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.keys(fitness.skinFold).map(site => (
            <div key={site}>
              <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">{site}</label>
              <input 
                type="text" placeholder="mm"
                value={(fitness.skinFold as any)[site]}
                onChange={(e) => setFitness({
                  ...fitness, 
                  skinFold: { ...fitness.skinFold, [site]: e.target.value }
                })}
                className="w-full bg-neutral-800 border-neutral-700 rounded-xl px-4 py-2"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">3-Minute Step Test (BPM)</label>
          <input 
            type="text" value={fitness.stepTestBpm} onChange={(e) => setFitness({...fitness, stepTestBpm: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3" placeholder="Resting BPM after 3 min"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Performance Test (Cals/Time)</label>
          <input 
            type="text" value={fitness.performanceTest} onChange={(e) => setFitness({...fitness, performanceTest: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3" placeholder="Air Dyne Cals OR Wall Sit Time"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Push-ups to Failure</label>
          <input 
            type="number" value={fitness.pushUps} onChange={(e) => setFitness({...fitness, pushUps: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3" placeholder="Total reps"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Posture Notes</label>
          <input 
            type="text" value={fitness.postureAnalysis} onChange={(e) => setFitness({...fitness, postureAnalysis: e.target.value})}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3" placeholder="Observation notes"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white italic tracking-tighter brand-font">SPEED FIT <span className="text-lime-500">ONBOARDING</span></h1>
          <div className="mt-8 flex items-center gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-lime-500' : 'bg-neutral-800'}`}></div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <div className="mt-12 flex justify-between">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="px-8 py-4 border border-neutral-700 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                Back
              </button>
            )}
            <button 
              onClick={nextStep}
              disabled={(step === 2 && !health.confirmed) || submitting}
              className="ml-auto px-12 py-4 bg-lime-500 text-black rounded-xl font-bold hover:bg-lime-400 transition-all accent-glow disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{step === 3 ? 'Complete Setup' : 'Continue'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
