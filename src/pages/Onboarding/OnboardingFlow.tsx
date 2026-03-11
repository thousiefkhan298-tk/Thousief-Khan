import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { ClientDetails, HealthAssessment } from '../../types';
import Step1Details from './Step1Details';
import Step2Health from './Step2Health';
import Step3Goals from './Step3Goals';

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
    bloodPressure: '',
    painActivities: [],
    medications: '',
    confirmed: false
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await firebaseService.submitOnboarding(user.uid, {
        clientDetails,
        healthAssessment: {
          ...healthAssessment,
          confirmed: true
        }
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
            {step === 1 && <>Personal <span className="text-brand-red">Intel</span></>}
            {step === 2 && <>Health <span className="text-brand-red">Scan</span></>}
            {step === 3 && <>Mission <span className="text-brand-red">Objectives</span></>}
          </h2>

          <div className="flex justify-center items-center space-x-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= i ? 'bg-brand-red shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'bg-neutral-800'}`} />
                {i < 3 && <div className={`h-[1px] w-12 transition-all duration-500 ${step > i ? 'bg-brand-red' : 'bg-neutral-800'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl">
          {step === 1 && (
            <Step1Details details={clientDetails} onChange={setClientDetails} onNext={handleNext} />
          )}
          {step === 2 && (
            <Step2Health assessment={healthAssessment} onChange={setHealthAssessment} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 3 && (
            <Step3Goals assessment={healthAssessment} onChange={setHealthAssessment} onSubmit={handleSubmit} onBack={handleBack} loading={loading} />
          )}
        </div>
        
        <p className="mt-12 text-center font-mono text-[8px] uppercase tracking-[0.4em] text-neutral-600">
          Secure Data Encryption Protocol Active // SpeedFit Systems v2.5
        </p>
      </div>
    </div>
  );
};

export default OnboardingFlow;
