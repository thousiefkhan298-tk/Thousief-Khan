import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  Activity, 
  Ruler, 
  Utensils, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Briefcase, 
  Shield, 
  RotateCcw, 
  ChevronRight, 
  Calendar, 
  Dumbbell, 
  Printer 
} from 'lucide-react';
import { User as UserType } from '../types';
import { format } from 'date-fns';

interface ClientAssessmentModalProps {
  client: UserType | any;
  onClose: () => void;
  onReopenAssessment?: (clientId: string) => void;
  onNavigateToWorkout?: (clientId: string) => void;
}

export const ClientAssessmentModal: React.FC<ClientAssessmentModalProps> = ({
  client,
  onClose,
  onReopenAssessment,
  onNavigateToWorkout
}) => {
  const [reopening, setReopening] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'medical' | 'fitness' | 'diet'>('all');

  if (!client) return null;

  const clientDetails = client.clientDetails || {};
  const fitness = client.fitnessAssessment || {};
  const medical = client.medicalAssessment || {};
  const diet = client.dietPreferences || {};
  const terms = client.termsConsent || {};
  const healthLegacy = client.healthAssessment || {};

  // Resolve values with fallback to top-level or draft data
  const height = fitness.height || healthLegacy.height || '--';
  const weight = fitness.weight || healthLegacy.weight || '--';
  
  // Calculate BMI if height and weight exist
  let bmi: number | null = null;
  let bmiCategory = '';
  if (height && weight && Number(height) > 0 && Number(weight) > 0) {
    const heightInMeters = Number(height) / 100;
    bmi = Number((Number(weight) / (heightInMeters * heightInMeters)).toFixed(1));
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 24.9) bmiCategory = 'Normal weight';
    else if (bmi < 29.9) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';
  }

  // Medical flags calculation
  const hasConditions = medical.conditions && medical.conditions.length > 0;
  const hasInjuries = Boolean(medical.injuriesOrSurgeries && medical.injuriesOrSurgeries.trim());
  const hasPain = medical.painOrRestrictions && medical.painOrRestrictions.some((p: string) => p !== 'None');
  const hasMeds = Boolean(medical.medications && medical.medications.trim());
  const hasAllergies = Boolean(medical.allergies && medical.allergies.trim());
  const hasDocRestrictions = Boolean(medical.doctorRestrictions && medical.doctorRestrictions.trim());
  const isMedicallyFlagged = medical.flaggedForReview || hasConditions || hasInjuries || hasPain || hasDocRestrictions;

  const handleReopen = async () => {
    if (!client.id) return;
    if (!confirm(`Are you sure you want to reopen the intake assessment for ${client.name}? They will be prompted to update their intake answers on their next login.`)) {
      return;
    }
    setReopening(true);
    try {
      if (onReopenAssessment) {
        await onReopenAssessment(client.id);
      }
      alert(`Intake assessment has been reopened for ${client.name}.`);
    } catch (err) {
      console.error(err);
      alert('Failed to reopen assessment.');
    } finally {
      setReopening(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="bg-[#141417] border border-[#26262B] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in-50 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#18181C] border-b border-[#26262B] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-wider bg-red-950/40 border border-red-900/40 px-2.5 py-0.5 rounded">
                Client Intake Assessment Dossier
              </span>
              {client.onboardingCompleted ? (
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Submitted on {client.onboardingSubmittedAt ? format(new Date(client.onboardingSubmittedAt), 'MMM dd, yyyy') : 'Completed'}
                </span>
              ) : (
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> In Progress (Step {client.onboardingStep || 1} of 5)
                </span>
              )}
              {isMedicallyFlagged && (
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Medical Review Required
                </span>
              )}
            </div>
            <h2 className="text-2xl font-display font-bold uppercase text-white tracking-tight">
              {clientDetails.fullName || client.name || 'Client Profile'}
            </h2>
            <p className="text-xs font-mono text-slate-400">
              Email: <span className="text-white">{client.email}</span> • Phone: <span className="text-white">{clientDetails.phoneNumber || client.phoneNumber || 'Not provided'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              aria-label="Print or save assessment"
              className="p-2.5 bg-[#141417] hover:bg-[#1E1E24] border border-[#26262B] text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer hidden sm:flex items-center gap-1.5"
              title="Print dossier"
            >
              <Printer className="w-4 h-4" />
              <span className="font-mono text-[10px]">Print</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2.5 bg-[#141417] hover:bg-[#1E1E24] border border-[#26262B] text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Pills */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#111114] border-b border-[#26262B] flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'Complete Dossier' },
            { id: 'medical', label: 'Medical Clearance' },
            { id: 'fitness', label: 'Fitness & Physical Baseline' },
            { id: 'diet', label: 'Diet & Nutrition' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A1A20]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* SECTION 1: BASIC PROFILE & DEMOGRAPHICS */}
          {(activeTab === 'all') && (
            <div className="bg-[#18181C] border border-[#26262B] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                <div className="flex items-center gap-2 text-brand-red font-mono text-xs font-bold uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>Section 1: Basic Profile & Emergency Contact</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Step 1 of 5</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Full Legal Name</span>
                  <span className="text-white font-bold text-sm">{clientDetails.fullName || client.name || '--'}</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Date of Birth</span>
                  <span className="text-white font-bold">{clientDetails.dob || '--'}</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Occupation</span>
                  <span className="text-white font-bold">{clientDetails.occupation || '--'}</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Contact Phone</span>
                  <span className="text-white font-bold">{clientDetails.phoneNumber || client.phoneNumber || '--'}</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Email Address</span>
                  <span className="text-white font-bold truncate block">{clientDetails.email || client.email || '--'}</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Emergency Contact</span>
                  <span className="text-white font-bold">{clientDetails.emergencyContact || 'None provided'}</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: FITNESS & BIOMETRIC BASELINE */}
          {(activeTab === 'all' || activeTab === 'fitness') && (
            <div className="bg-[#18181C] border border-[#26262B] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>Section 2: Fitness & Physical Assessment</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Step 2 of 5</span>
              </div>

              {/* Biometrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B] text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Height</span>
                  <span className="text-xl font-bold font-display text-white">{height} {height !== '--' && 'cm'}</span>
                </div>
                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B] text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Weight</span>
                  <span className="text-xl font-bold font-display text-white">{weight} {weight !== '--' && 'kg'}</span>
                </div>
                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B] text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Calculated BMI</span>
                  <span className="text-xl font-bold font-display text-emerald-400">{bmi ? `${bmi}` : '--'}</span>
                  {bmiCategory && <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{bmiCategory}</span>}
                </div>
                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B] text-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Experience</span>
                  <span className="text-sm font-bold font-mono text-white block mt-1">{fitness.trainingExperience || 'Beginner'}</span>
                </div>
              </div>

              {/* Goals, Activity & Equipment */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1.5">Primary Fitness Goals</span>
                  <div className="flex flex-wrap gap-1.5">
                    {fitness.goals && fitness.goals.length > 0 ? (
                      fitness.goals.map((goal: string, idx: number) => (
                        <span key={idx} className="bg-red-950/40 text-red-300 border border-red-900/50 px-2.5 py-1 rounded-md text-[11px] font-bold">
                          🎯 {goal}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                    <span className="text-[9px] text-slate-500 uppercase block">Activity Level</span>
                    <span className="text-white font-bold">{fitness.activityLevel || 'Moderately Active'}</span>
                  </div>
                  <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                    <span className="text-[9px] text-slate-500 uppercase block">Equipment Access</span>
                    <span className="text-white font-bold">
                      {Array.isArray(fitness.equipment) ? fitness.equipment.join(', ') : (fitness.equipment || 'Full Gym')}
                    </span>
                  </div>
                </div>

                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Preferred Training Times</span>
                  <span className="text-white font-bold">
                    {Array.isArray(fitness.preferredTrainingTimes) ? fitness.preferredTrainingTimes.join(' | ') : (fitness.preferredTrainingTimes || 'Morning')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: MEDICAL & HEALTH CLEARANCE (CRITICAL FOR TRAINER) */}
          {(activeTab === 'all' || activeTab === 'medical') && (
            <div className={`bg-[#18181C] border ${isMedicallyFlagged ? 'border-rose-900/60 shadow-[0_0_20px_rgba(225,29,72,0.15)]' : 'border-[#26262B]'} rounded-xl p-5 space-y-4`}>
              <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Heart className="w-4 h-4" />
                  <span>Section 3: Medical Assessment & PAR-Q Clearance</span>
                </div>
                <div className="flex items-center gap-2">
                  {medical.noKnownConditions ? (
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                      ✓ Zero Known Medical Conditions
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                      Conditions Noted
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">Step 3 of 5</span>
                </div>
              </div>

              {/* Conditions Checklist Badges */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1.5">Diagnosed Conditions</span>
                  {hasConditions ? (
                    <div className="flex flex-wrap gap-1.5">
                      {medical.conditions.map((cond: string, idx: number) => (
                        <span key={idx} className="bg-rose-950/60 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-md text-[11px] font-bold">
                          ⚠️ {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">None reported by client.</span>
                  )}
                </div>

                {medical.otherConditions && (
                  <div className="bg-[#141417] p-3 rounded-lg border border-rose-900/40">
                    <span className="text-[9px] text-rose-400 uppercase font-bold block">Other Medical Conditions</span>
                    <p className="text-white mt-0.5">{medical.otherConditions}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B]">
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Past Injuries or Surgeries</span>
                    <p className={`mt-1 font-bold ${hasInjuries ? 'text-amber-300' : 'text-slate-400 font-normal italic'}`}>
                      {medical.injuriesOrSurgeries || 'None reported'}
                    </p>
                  </div>
                  <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B]">
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Pain or Joint Restrictions</span>
                    <p className={`mt-1 font-bold ${hasPain ? 'text-amber-300' : 'text-slate-400 font-normal italic'}`}>
                      {Array.isArray(medical.painOrRestrictions) ? medical.painOrRestrictions.join(', ') : (medical.painOrRestrictions || 'None')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B]">
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Current Medications</span>
                    <p className={`mt-1 ${hasMeds ? 'text-white font-bold' : 'text-slate-400 italic'}`}>
                      {medical.medications || 'None reported'}
                    </p>
                  </div>
                  <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B]">
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Allergies (Drug / Environmental)</span>
                    <p className={`mt-1 ${hasAllergies ? 'text-white font-bold' : 'text-slate-400 italic'}`}>
                      {medical.allergies || 'None reported'}
                    </p>
                  </div>
                </div>

                {medical.doctorRestrictions && (
                  <div className="bg-amber-950/30 p-3.5 rounded-lg border border-amber-900/40">
                    <span className="text-[9px] text-amber-400 uppercase font-bold block flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Doctor's Exercise Restrictions
                    </span>
                    <p className="text-amber-200 mt-1 font-bold">{medical.doctorRestrictions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: DIET PREFERENCES & ALLERGIES */}
          {(activeTab === 'all' || activeTab === 'diet') && (
            <div className="bg-[#18181C] border border-[#26262B] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Utensils className="w-4 h-4" />
                  <span>Section 4: Diet & Nutritional Profile</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Step 4 of 5</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Dietary Preference</span>
                  <span className="text-white font-bold text-base mt-0.5 block">🥗 {diet.preference || 'Non-Vegetarian'}</span>
                </div>

                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B]">
                  <span className="text-[9px] text-slate-500 uppercase block">Food Allergies & Intolerances</span>
                  <span className="text-white font-bold text-base mt-0.5 block">
                    {Array.isArray(diet.foodAllergies) ? diet.foodAllergies.join(', ') : (diet.foodAllergies || 'None')}
                  </span>
                </div>
              </div>

              {/* Meal Timings Schedule */}
              {diet.mealTimings && (
                <div className="bg-[#141417] p-3.5 rounded-lg border border-[#26262B] space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Client Meal Timing Routine</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="bg-[#18181C] p-2 rounded border border-[#26262B] text-center">
                      <span className="text-[8px] text-slate-500 uppercase block">Breakfast</span>
                      <span className="text-white font-bold">{diet.mealTimings.breakfast || '08:30'}</span>
                    </div>
                    <div className="bg-[#18181C] p-2 rounded border border-[#26262B] text-center">
                      <span className="text-[8px] text-slate-500 uppercase block">Lunch</span>
                      <span className="text-white font-bold">{diet.mealTimings.lunch || '13:30'}</span>
                    </div>
                    <div className="bg-[#18181C] p-2 rounded border border-[#26262B] text-center">
                      <span className="text-[8px] text-slate-500 uppercase block">Snack</span>
                      <span className="text-white font-bold">{diet.mealTimings.eveningSnack || '17:30'}</span>
                    </div>
                    <div className="bg-[#18181C] p-2 rounded border border-[#26262B] text-center">
                      <span className="text-[8px] text-slate-500 uppercase block">Dinner</span>
                      <span className="text-white font-bold">{diet.mealTimings.dinner || '21:00'}</span>
                    </div>
                  </div>
                </div>
              )}

              {diet.dietaryRestrictions && (
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B] font-mono text-xs">
                  <span className="text-[9px] text-slate-500 uppercase block">Special Food Restrictions / Notes</span>
                  <p className="text-white mt-1">{diet.dietaryRestrictions}</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: TERMS & DIGITAL CONSENT */}
          {activeTab === 'all' && (
            <div className="bg-[#18181C] border border-[#26262B] rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-2.5">
                <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Section 5: Terms of Service & PAR-Q Consent</span>
                </div>
                <span className="text-[10px] text-slate-400">Step 5 of 5</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[8px] text-slate-500 uppercase block">Consent Accepted</span>
                  <span className="text-emerald-400 font-bold">✓ Signed Electronically</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[8px] text-slate-500 uppercase block">Digital Signature</span>
                  <span className="text-white font-bold">{terms.typedFullName || client.name || '--'}</span>
                </div>
                <div className="bg-[#141417] p-3 rounded-lg border border-[#26262B]">
                  <span className="text-[8px] text-slate-500 uppercase block">Timestamp</span>
                  <span className="text-slate-300">
                    {terms.acceptedAt ? format(new Date(terms.acceptedAt), 'yyyy-MM-dd HH:mm') : (client.onboardingSubmittedAt ? format(new Date(client.onboardingSubmittedAt), 'yyyy-MM-dd HH:mm') : 'Recorded')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-[#18181C] border-t border-[#26262B] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReopen}
              disabled={reopening}
              className="px-4 py-2.5 bg-[#141417] hover:bg-[#1E1E24] border border-[#26262B] text-amber-300 hover:text-amber-200 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{reopening ? 'Reopening...' : 'Reopen Intake Form for Client'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToWorkout && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToWorkout(client.id);
                }}
                className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(220,38,38,0.35)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Formulate & Approve Workout</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[#141417] hover:bg-[#1E1E24] border border-[#26262B] text-slate-300 hover:text-white rounded-xl font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
