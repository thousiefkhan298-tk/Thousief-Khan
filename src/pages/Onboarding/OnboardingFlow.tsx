import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { ClientDetails, FitnessAssessmentData, MedicalAssessmentData, DietPreferencesData, TermsConsentData } from '../../types';
import Step1Details from './Step1Details';
import Step2FitnessAssessment from './Step2FitnessAssessment';
import Step3MedicalAssessment from './Step3MedicalAssessment';
import Step4DietPreferences from './Step4DietPreferences';
import Step5TermsAndConsent from './Step5TermsAndConsent';
import { SpeedFitLogo } from '../../components/SpeedFitLogo';
import { Check, Shield } from 'lucide-react';

interface Props {
  user: any;
  userData: any;
}

const STEP_TITLES = [
  'Basic Profile',
  'Fitness Assessment',
  'Medical Assessment',
  'Diet Preferences',
  'Terms & Consent'
];

const OnboardingFlow: React.FC<Props> = ({ user, userData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [savingStep, setSavingStep] = useState(false);

  // Resume step from saved draft if available
  const initialStep = (userData?.onboardingStep && userData.onboardingStep >= 1 && userData.onboardingStep <= 5)
    ? userData.onboardingStep
    : 1;
  const [step, setStep] = useState(initialStep);

  const existingDraft = userData?.onboardingDraft || {};

  // Form states initialized with existing draft or profile data
  const [clientDetails, setClientDetails] = useState<Partial<ClientDetails>>(() => ({
    fullName: existingDraft.clientDetails?.fullName || userData?.clientDetails?.fullName || userData?.name || '',
    email: user?.email || '',
    dob: existingDraft.clientDetails?.dob || userData?.clientDetails?.dob || '',
    phoneNumber: existingDraft.clientDetails?.phoneNumber || userData?.clientDetails?.phoneNumber || userData?.phoneNumber || '',
    occupation: existingDraft.clientDetails?.occupation || userData?.clientDetails?.occupation || '',
    emergencyContact: existingDraft.clientDetails?.emergencyContact || userData?.clientDetails?.emergencyContact || ''
  }));

  const [fitnessAssessment, setFitnessAssessment] = useState<Partial<FitnessAssessmentData>>(() => ({
    height: existingDraft.fitnessAssessment?.height || userData?.fitnessAssessment?.height || userData?.healthAssessment?.height || '',
    weight: existingDraft.fitnessAssessment?.weight || userData?.fitnessAssessment?.weight || userData?.healthAssessment?.weight || '',
    goals: existingDraft.fitnessAssessment?.goals || userData?.fitnessAssessment?.goals || userData?.healthAssessment?.goals || ['Fat Loss & Weight Management'],
    trainingExperience: existingDraft.fitnessAssessment?.trainingExperience || userData?.fitnessAssessment?.trainingExperience || 'Beginner',
    activityLevel: existingDraft.fitnessAssessment?.activityLevel || userData?.fitnessAssessment?.activityLevel || 'Moderately Active',
    equipment: existingDraft.fitnessAssessment?.equipment || userData?.fitnessAssessment?.equipment || ['Full Gym (Barbells, Dumbbells, Machines, Cables)'],
    preferredTrainingTimes: existingDraft.fitnessAssessment?.preferredTrainingTimes || userData?.fitnessAssessment?.preferredTrainingTimes || ['Morning (8:00 AM - 11:00 AM)']
  }));

  const [medicalAssessment, setMedicalAssessment] = useState<Partial<MedicalAssessmentData>>(() => ({
    noKnownConditions: existingDraft.medicalAssessment?.noKnownConditions !== undefined
      ? existingDraft.medicalAssessment.noKnownConditions
      : (userData?.medicalAssessment?.noKnownConditions ?? false),
    conditions: existingDraft.medicalAssessment?.conditions || userData?.medicalAssessment?.conditions || userData?.healthAssessment?.conditions || [],
    otherConditions: existingDraft.medicalAssessment?.otherConditions || userData?.medicalAssessment?.otherConditions || '',
    injuriesOrSurgeries: existingDraft.medicalAssessment?.injuriesOrSurgeries || userData?.medicalAssessment?.injuriesOrSurgeries || '',
    painOrRestrictions: existingDraft.medicalAssessment?.painOrRestrictions || userData?.medicalAssessment?.painOrRestrictions || userData?.healthAssessment?.painActivities || ['None'],
    medications: existingDraft.medicalAssessment?.medications || userData?.medicalAssessment?.medications || userData?.healthAssessment?.medications || '',
    allergies: existingDraft.medicalAssessment?.allergies || userData?.medicalAssessment?.allergies || '',
    doctorRestrictions: existingDraft.medicalAssessment?.doctorRestrictions || userData?.medicalAssessment?.doctorRestrictions || '',
    flaggedForReview: existingDraft.medicalAssessment?.flaggedForReview ?? false
  }));

  const [dietPreferences, setDietPreferences] = useState<Partial<DietPreferencesData>>(() => ({
    preference: existingDraft.dietPreferences?.preference || userData?.dietPreferences?.preference || 'Non-Vegetarian',
    foodAllergies: existingDraft.dietPreferences?.foodAllergies || userData?.dietPreferences?.foodAllergies || ['None'],
    mealTimings: existingDraft.dietPreferences?.mealTimings || userData?.dietPreferences?.mealTimings || {
      breakfast: '08:30',
      lunch: '13:30',
      eveningSnack: '17:30',
      dinner: '21:00'
    },
    dietaryRestrictions: existingDraft.dietPreferences?.dietaryRestrictions || userData?.dietPreferences?.dietaryRestrictions || ''
  }));

  const [termsConsent, setTermsConsent] = useState<Partial<TermsConsentData>>(() => ({
    accepted: existingDraft.termsConsent?.accepted || false,
    typedFullName: existingDraft.termsConsent?.typedFullName || clientDetails.fullName || '',
    termsVersion: '2.5'
  }));

  // Auto-save partial progress to Firestore whenever moving between steps
  const saveCurrentDraft = async (nextStepNumber: number) => {
    if (!user?.uid) return;
    setSavingStep(true);
    try {
      const payload = {
        clientDetails,
        fitnessAssessment,
        medicalAssessment,
        dietPreferences,
        termsConsent
      };
      await firebaseService.saveOnboardingProgress(user.uid, nextStepNumber, payload);
    } catch (err) {
      console.warn('Could not save draft progress to cloud:', err);
    } finally {
      setSavingStep(false);
    }
  };

  const handleNext = async () => {
    const nextStep = step + 1;
    await saveCurrentDraft(nextStep);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    const prevStep = Math.max(1, step - 1);
    setStep(prevStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await firebaseService.submitOnboarding(user.uid, {
        clientDetails,
        fitnessAssessment,
        medicalAssessment,
        dietPreferences,
        termsConsent: {
          ...termsConsent,
          accepted: true,
          acceptedAt: new Date().toISOString(),
          termsVersion: '2.5'
        },
        name: clientDetails.fullName || userData?.name || 'Athlete'
      });

      // Clear draft flag and navigate to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      alert('Failed to save assessment. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F11] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#FF3B30_0.5px,transparent_0.5px)] opacity-5 [background-size:24px_24px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        
        {/* SPEED FIT Header Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <SpeedFitLogo className="h-10 w-auto" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF3B30] font-bold">
              Client Onboarding & Assessment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-white">
            {STEP_TITLES[step - 1]}
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Complete this initial intake to open your personalized Speed Fit dashboard.
          </p>

          {savingStep && (
            <p className="text-[10px] font-mono text-neutral-500 animate-pulse mt-1">
              Saving draft progress...
            </p>
          )}

          {/* 5-Step Progress Indicators */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6">
            {[1, 2, 3, 4, 5].map((s) => {
              const isDone = step > s;
              const isCurrent = step === s;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isDone
                        ? 'bg-[#FF3B30] text-white shadow-sm'
                        : isCurrent
                        ? 'bg-white text-black ring-2 ring-[#FF3B30]'
                        : 'bg-[#1E1E22] text-neutral-500 border border-neutral-800'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  {s < 5 && (
                    <div className={`w-4 sm:w-8 h-0.5 rounded transition-colors ${step > s ? 'bg-[#FF3B30]' : 'bg-neutral-800'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-[#141417] border border-neutral-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {step === 1 && (
            <Step1Details
              details={clientDetails}
              onChange={setClientDetails}
              onNext={handleNext}
            />
          )}

          {step === 2 && (
            <Step2FitnessAssessment
              fitness={fitnessAssessment}
              onChange={setFitnessAssessment}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 3 && (
            <Step3MedicalAssessment
              medical={medicalAssessment}
              onChange={setMedicalAssessment}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 4 && (
            <Step4DietPreferences
              diet={dietPreferences}
              onChange={setDietPreferences}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 5 && (
            <Step5TermsAndConsent
              termsConsent={termsConsent}
              clientFullName={clientDetails.fullName || ''}
              onChange={setTermsConsent}
              onSubmit={handleFinalSubmit}
              onBack={handleBack}
              loading={loading}
            />
          )}
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          Encrypted Storage // Speed Fit Training Systems
        </p>
      </div>
    </div>
  );
};

export default OnboardingFlow;
