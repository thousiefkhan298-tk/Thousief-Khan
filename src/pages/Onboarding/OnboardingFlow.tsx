import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { ClientDetails, HealthAssessment, ConcernForm, FitnessAssessment } from '../../types';
import Step1Details from './Step1Details';
import StepGoalsAndConcerns from './StepGoalsAndConcerns';
import Step2Health from './Step2Health';
import StepBMIReport from './StepBMIReport';
import StepFitness from './StepFitness';
import Step4Consent from './Step4Consent';


interface Props {
  user: any;
  userData: any;
}

const OnboardingFlow: React.FC<Props> = ({ user, userData }) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [clientDetails, setClientDetails] = useState<Partial<ClientDetails>>({
    fullName: userData?.name || '',
    email: user?.email || '',
    age: '',
    dob: '',
    gender: '',
    phoneNumber: '',
    address: '',
    emergencyContact: ''
  });

  const [concern, setConcern] = useState<Partial<ConcernForm>>({
    primaryConcern: '',
    secondaryConcern: '',
    expectations: '',
    limitations: ''
  });

  const [healthAssessment, setHealthAssessment] = useState<Partial<HealthAssessment>>({
    conditions: [],
    otherConditions: '',
    smoking: false,
    alcohol: false,
    stress: 'Low',
    occupation: 'Sedentary',
    sleepHours: '',
    currentlyActive: false,
    pastExperience: '',
    trainingDaysPerWeek: '',
    goals: [],
    targetWeight: '',
    targetDate: '',
    height: '',
    weight: '',
    waist: '',
    painActivities: [],
    medications: '',
    confirmed: false,
    consentGiven: false,
    healthConcerns: ''
  });

  const [fitnessAssessment, setFitnessAssessment] = useState<Partial<FitnessAssessment>>({
    clientId: user?.uid || '',
    date: new Date().toISOString().split('T')[0],
    dob: '',
    gender: '',
    assessNum: '1',
    admin: '',
    height: '',
    weight: '',
    bodyFat: { triceps: '', chest: '', midAxillary: '', subScapular: '', abdomen: '', supraIliac: '', thigh: '' },
    circumference: { neck: '', shoulders: '', chest: '', waist: '', hips: '', rightThigh: '', leftThigh: '', rightUpperArm: '', leftUpperArm: '' },
    movementScreen: {
      deepSquat: { raw: '', final: '', comments: '' },
      hurdleStepL: { raw: '', final: '', comments: '' },
      hurdleStepR: { raw: '', final: '', comments: '' },
      inlineLungeL: { raw: '', final: '', comments: '' },
      inlineLungeR: { raw: '', final: '', comments: '' },
      shoulderMobilityL: { raw: '', final: '', comments: '' },
      shoulderMobilityR: { raw: '', final: '', comments: '' },
      impingementL: { raw: '', final: '', comments: '' },
      impingementR: { raw: '', final: '', comments: '' },
      straightLegRaiseL: { raw: '', final: '', comments: '' },
      straightLegRaiseR: { raw: '', final: '', comments: '' },
      trunkStability: { raw: '', final: '', comments: '' },
      pressUpClearing: { raw: '', final: '', comments: '' },
      rotaryStabilityL: { raw: '', final: '', comments: '' },
      rotaryStabilityR: { raw: '', final: '', comments: '' },
      posteriorRocking: { raw: '', final: '', comments: '' },
      totalScore: ''
    },
    physicalTests: {
      stepTestBpm: '',
      calorieBurnAirDyne: '',
      maximalWallSitTime: '',
      pushUps: '',
      maximalPlankTime: ''
    },
    postureAnalysis: '',
    notes: ''
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await firebaseService.submitOnboarding(user.uid, {
        clientDetails,
        concern,
        healthAssessment: {
          ...healthAssessment,
          confirmed: true
        },
        fitnessAssessment
      });

      // Force reload to update app state
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Failed to save data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-16 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-[1px] w-12 bg-neutral-800"></div>
            <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-brand-red/80">BUILD TO TRANSFORMATION</p>
            <div className="h-[1px] w-12 bg-neutral-800"></div>
          </div>
          
          <h2 className="text-6xl font-display italic uppercase leading-tight mb-8 text-white">
            {step === 1 && <>Personal <span className="text-brand-red">Details</span></>}
            {step === 2 && <>Goals & <span className="text-brand-red">Concerns</span></>}
            {step === 3 && <>Health <span className="text-brand-red">Scan</span></>}
            {step === 4 && <>Health <span className="text-brand-red">Report</span></>}
            {step === 5 && <>Fitness <span className="text-brand-red">Metrics</span></>}
            {step === 6 && <>Final <span className="text-brand-red">Clearance</span></>}
          </h2>

          <div className="flex justify-center items-center space-x-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= i ? 'bg-brand-red shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'bg-neutral-800'}`} />
                {i < 6 && <div className={`h-[1px] w-12 transition-all duration-500 ${step > i ? 'bg-brand-red' : 'bg-neutral-800'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 rounded-[2.5rem] p-10 shadow-2xl">
          {step === 1 && (
            <Step1Details details={clientDetails} onChange={setClientDetails} onNext={handleNext} />
          )}
          {step === 2 && (
            <StepGoalsAndConcerns assessment={healthAssessment} concern={concern} onChangeAssessment={setHealthAssessment} onChangeConcern={setConcern} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 3 && (
            <Step2Health assessment={healthAssessment} onChange={setHealthAssessment} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 4 && (
            <StepBMIReport assessment={healthAssessment} clientDetails={clientDetails} onChange={setHealthAssessment} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 5 && (
            <StepFitness assessment={fitnessAssessment} onChange={setFitnessAssessment} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 6 && (
            <Step4Consent assessment={healthAssessment} onChange={setHealthAssessment} onSubmit={handleSubmit} onBack={handleBack} />
          )}
        </div>
        
        <p className="mt-12 text-center font-mono text-[8px] uppercase tracking-[0.4em] text-neutral-50 font-bold">
          Secure Data Encryption Active // SpeedFit Systems v2.5
        </p>
      </div>
    </div>
  );
};

export default OnboardingFlow;
