import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Flame, 
  Activity, 
  Heart, 
  Dumbbell, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Sparkles,
  Phone,
  User,
  Mail,
  Scale,
  Compass
} from 'lucide-react';
import { SpeedFitLogo } from '../../components/SpeedFitLogo';
import { formatWhatsAppPhone } from '../../utils/healthAssessmentFlags';

export const PublicAssessmentPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [contact, setContact] = useState({
    name: '',
    whatsapp: '',
    email: '',
    age: '',
    sex: 'Male',
    height: '',
    weight: ''
  });

  const [goals, setGoals] = useState({
    primaryGoal: 'Fat Loss',
    targetWeight: '',
    timeline: '3 months',
    motivationNotes: ''
  });

  const [training, setTraining] = useState({
    experience: 'Beginner',
    currentActivity: 'Sedentary',
    location: 'Speed Fit Gym',
    equipmentAccess: ['Dumbbells', 'Machines'] as string[],
    sessionsPerWeek: '3',
    sessionLength: '45 mins',
    availability: ['Evening (5 PM - 8 PM)'] as string[]
  });

  const [parq, setParq] = useState({
    heartCondition: false,
    chestPainActive: false,
    chestPainRest: false,
    dizzinessOrBalance: false,
    boneOrJointIssue: false,
    bloodPressureOrHeartMeds: false,
    otherReasonNoExercise: false
  });

  const [injuriesAndNotes, setInjuriesAndNotes] = useState('');

  const [dailyLife, setDailyLife] = useState({
    sleepHours: '7-8 hours',
    waterIntakeLiters: '2-3 Liters',
    stressLevel: 'Moderate',
    dietPreference: 'Non-Vegetarian',
    tobaccoUse: 'None',
    alcoholUse: 'None',
    allergies: ''
  });

  const [consent, setConsent] = useState(false);

  // Toggle helpers
  const toggleEquipment = (item: string) => {
    setTraining(prev => {
      const exists = prev.equipmentAccess.includes(item);
      return {
        ...prev,
        equipmentAccess: exists 
          ? prev.equipmentAccess.filter(i => i !== item)
          : [...prev.equipmentAccess, item]
      };
    });
  };

  const toggleAvailability = (slot: string) => {
    setTraining(prev => {
      const exists = prev.availability.includes(slot);
      return {
        ...prev,
        availability: exists
          ? prev.availability.filter(s => s !== slot)
          : [...prev.availability, slot]
      };
    });
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!contact.name.trim() || contact.name.trim().length < 2) {
        errors.name = 'Please enter your full name (minimum 2 characters).';
      }
      const digits = contact.whatsapp.replace(/[^0-9]/g, '');
      if (!digits || digits.length < 7 || digits.length > 15) {
        errors.whatsapp = 'Please enter a valid WhatsApp phone number (minimum 7 digits).';
      }
      if (contact.email.trim() && !contact.email.includes('@')) {
        errors.email = 'Please enter a valid email address.';
      }
    } else if (currentStep === 2) {
      if (!goals.primaryGoal) {
        errors.primaryGoal = 'Please choose your primary transformation goal.';
      }
    } else if (currentStep === 3) {
      if (training.equipmentAccess.length === 0) {
        errors.equipment = 'Please select at least one available equipment type.';
      }
      if (training.availability.length === 0) {
        errors.availability = 'Please select at least one time slot you are available.';
      }
    } else if (currentStep === 5) {
      if (!consent) {
        errors.consent = 'You must confirm and consent before submitting your assessment.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setValidationErrors({});
      setCurrentStep(prev => Math.min(5, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setValidationErrors({});
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        contact: {
          name: contact.name.trim(),
          whatsapp: contact.whatsapp.trim(),
          email: contact.email.trim(),
          age: contact.age ? Number(contact.age) : undefined,
          sex: contact.sex,
          height: contact.height ? Number(contact.height) : undefined,
          weight: contact.weight ? Number(contact.weight) : undefined
        },
        goals,
        assessment: {
          training,
          parq,
          injuriesAndMedicalNotes: injuriesAndNotes.trim(),
          dailyLife
        },
        consent: {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          acknowledgedNotMedical: true
        },
        source: 'public_assessment'
      };

      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit assessment. Please check your connection.');
      }

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'Unable to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAnyParqFlag = Object.values(parq).some(val => val === true);

  // Success Confirmation Screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-white flex flex-col justify-between selection:bg-[#E10600] selection:text-white">
        <header className="border-b border-[#222228] px-4 py-4 bg-[#141417]">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <SpeedFitLogo />
            <Link to="/login" className="text-xs font-mono text-gray-400 hover:text-white transition-colors">
              Client Portal →
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
          <div className="bg-[#141417] border border-[#262630] rounded-3xl p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#E10600]/15 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="w-16 h-16 bg-[#E10600]/20 border border-[#E10600]/40 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#E10600]">
              <CheckCircle className="w-9 h-9" />
            </div>

            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E10600] font-bold block mb-1">
              Speed Fit Biometric Intake Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-white mb-3">
              Assessment Received, {contact.name.split(' ')[0]}!
            </h1>
            <p className="text-sm text-gray-300 max-w-lg mx-auto leading-relaxed mb-6">
              Thank you for completing your Speed Fit initial assessment. Your biometrics, training goals, and health checks have been securely routed to our coaching staff.
            </p>

            <div className="bg-[#1B1B20] border border-[#2D2D38] rounded-2xl p-4 sm:p-5 text-left mb-6 space-y-2.5">
              <p className="text-xs font-mono text-[#E10600] uppercase font-bold tracking-wider">What Happens Next?</p>
              <ul className="text-xs text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] mt-1.5 shrink-0"></span>
                  <span><strong>Trainer Review:</strong> Coach Thousief Khan and the Speed Fit performance team will analyze your training profile, health background, and {goals.primaryGoal} targets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] mt-1.5 shrink-0"></span>
                  <span><strong>WhatsApp Message:</strong> You will receive a direct message on WhatsApp at <strong className="text-white">{contact.whatsapp}</strong> within 24 hours with your preliminary roadmap.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] mt-1.5 shrink-0"></span>
                  <span><strong>Consultation &amp; Scheduling:</strong> We'll answer questions, coordinate your schedule, and set up your Speed Fit athlete profile.</span>
                </li>
              </ul>
            </div>

            {hasAnyParqFlag && (
              <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3.5 mb-6 text-left flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed">
                  <strong>Trainer Health Notice:</strong> Based on your PAR-Q responses, our certified trainer will conduct a careful review with you before strenuous loading and recommend a medical clearance certificate if required.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentStep(1);
                  setContact({ name: '', whatsapp: '', email: '', age: '', sex: 'Male', height: '', weight: '' });
                }}
                className="px-6 py-3 min-h-[44px] bg-[#222228] hover:bg-[#2A2A32] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Submit another assessment
              </button>
              <Link
                to="/login"
                className="px-6 py-3 min-h-[44px] bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_16px_rgba(225,6,0,0.3)] flex items-center justify-center gap-2"
              >
                Go to Speed Fit Login
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#222228] px-4 py-4 text-center text-[11px] font-mono text-gray-500">
          SPEED FIT &copy; {new Date().getFullYear()} &mdash; BUILD TO TRANSFORM
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white flex flex-col justify-between selection:bg-[#E10600] selection:text-white">
      
      {/* TOP HEADER */}
      <header className="border-b border-[#222228] bg-[#141417]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SpeedFitLogo />
            <div className="hidden sm:block border-l border-[#2B2B33] pl-3">
              <span className="text-[10px] font-mono uppercase text-[#E10600] font-bold tracking-widest block">Intake Wizard</span>
              <p className="text-xs font-medium text-gray-300">Client Fitness Assessment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">Step {currentStep} of 5</span>
            <div className="w-20 sm:w-28 h-2 bg-[#222228] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#E10600] transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-2xl mx-auto w-full px-4 py-6 sm:py-8 flex-1">
        
        {/* Step Indicator Badges */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-6">
          {[
            { step: 1, label: 'About You', icon: User },
            { step: 2, label: 'Goal', icon: Flame },
            { step: 3, label: 'Training', icon: Dumbbell },
            { step: 4, label: 'Health Check', icon: Heart },
            { step: 5, label: 'Daily Life', icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentStep === item.step;
            const completed = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                disabled={item.step > currentStep}
                onClick={() => {
                  if (item.step < currentStep) {
                    setCurrentStep(item.step);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                  active 
                    ? 'bg-[#E10600] text-white shadow-[0_2px_10px_rgba(225,6,0,0.3)] font-bold'
                    : completed
                      ? 'bg-[#1C1C22] text-[#E10600] cursor-pointer hover:bg-[#25252D]'
                      : 'bg-[#141417] text-gray-500 opacity-60'
                }`}
              >
                <Icon className="w-4 h-4 mb-1 shrink-0" />
                <span className="text-[10px] font-mono tracking-tight hidden sm:inline truncate w-full">{item.label}</span>
                <span className="text-[9px] font-mono sm:hidden">{item.step}</span>
              </button>
            );
          })}
        </div>

        {/* STEP CARD */}
        <div className="bg-[#141417] border border-[#262630] rounded-3xl p-5 sm:p-8 shadow-xl relative">
          
          {/* STEP 1: ABOUT YOU */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E10600] font-bold block mb-1">
                  Step 1 of 5
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-white">
                  About You
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Enter your core contact details so your coach can personalize your biometrics and reach out.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Full Name <span className="text-[#E10600]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={contact.name}
                    onChange={e => setContact({ ...contact, name: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 transition-all outline-none"
                  />
                  {validationErrors.name && (
                    <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    WhatsApp Phone Number <span className="text-[#E10600]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={contact.whatsapp}
                      onChange={e => setContact({ ...contact, whatsapp: e.target.value })}
                      className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 transition-all outline-none"
                    />
                    <Phone className="w-4 h-4 text-gray-500 absolute right-4 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    Your trainer will message you on WhatsApp for quick scheduling &amp; follow-up.
                  </p>
                  {validationErrors.whatsapp && (
                    <p className="text-xs text-red-400 mt-1">{validationErrors.whatsapp}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Email Address <span className="text-gray-500 font-normal">(Optional — for workout blueprint PDF)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={contact.email}
                      onChange={e => setContact({ ...contact, email: e.target.value })}
                      className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 transition-all outline-none"
                    />
                    <Mail className="w-4 h-4 text-gray-500 absolute right-4 top-3.5 pointer-events-none" />
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-red-400 mt-1">{validationErrors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 28"
                      value={contact.age}
                      onChange={e => setContact({ ...contact, age: e.target.value })}
                      className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Biological Sex
                    </label>
                    <select
                      value={contact.sex}
                      onChange={e => setContact({ ...contact, sex: e.target.value })}
                      className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 175"
                      value={contact.height}
                      onChange={e => setContact({ ...contact, height: e.target.value })}
                      className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Current Weight (kg)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 78"
                      value={contact.weight}
                      onChange={e => setContact({ ...contact, weight: e.target.value })}
                      className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GOAL */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E10600] font-bold block mb-1">
                  Step 2 of 5
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-white">
                  Your Transformation Goal
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Define your mission so Speed Fit can design your exact progressive protocol.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Primary Focus <span className="text-[#E10600]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'Fat Loss', label: 'Fat Loss & Leanness', desc: 'Shed body fat while preserving lean muscle mass' },
                    { id: 'Muscle Gain', label: 'Muscle Building & Hypertrophy', desc: 'Increase muscular size, shape, and strength' },
                    { id: 'Body Recomposition', label: 'Body Recomposition', desc: 'Simultaneous fat reduction and muscle toning' },
                    { id: 'Athletic Conditioning', label: 'Athletic Performance', desc: 'Speed, stamina, power, and metabolic conditioning' },
                    { id: 'Posture & Mobility', label: 'Posture & Joint Rehab', desc: 'Correct rounded shoulders, back stiffness & mobility' },
                    { id: 'General Fitness', label: 'General Health & Longevity', desc: 'Daily energy, functional strength, and vitality' },
                  ].map(item => {
                    const selected = goals.primaryGoal === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setGoals({ ...goals, primaryGoal: item.id })}
                        className={`p-3.5 min-h-[44px] rounded-xl border text-left transition-all ${
                          selected
                            ? 'bg-[#E10600]/15 border-[#E10600] text-white shadow-md'
                            : 'bg-[#1B1B20] border-[#2D2D38] text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <p className={`text-xs font-bold ${selected ? 'text-[#E10600]' : 'text-white'}`}>{item.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Target Weight (kg) <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={goals.targetWeight}
                    onChange={e => setGoals({ ...goals, targetWeight: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Target Timeline
                  </label>
                  <select
                    value={goals.timeline}
                    onChange={e => setGoals({ ...goals, timeline: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="1 month">1 month (Kickstart Sprint)</option>
                    <option value="3 months">3 months (Speed Fit Transformation Cycle)</option>
                    <option value="6 months">6 months (Deep Physical Overhaul)</option>
                    <option value="12+ months">12+ months (Long-Term Lifestyle Adaptation)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  What is driving this transformation right now? <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Upcoming event, feeling low energy at work, recovering strength after injury..."
                  value={goals.motivationNotes}
                  onChange={e => setGoals({ ...goals, motivationNotes: e.target.value })}
                  className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: TRAINING */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E10600] font-bold block mb-1">
                  Step 3 of 5
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-white">
                  Training &amp; Logistics
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Tell us where you train and how much time you can realistically dedicate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Experience Level
                  </label>
                  <select
                    value={training.experience}
                    onChange={e => setTraining({ ...training, experience: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="Beginner">Beginner (0 - 6 months)</option>
                    <option value="Intermediate">Intermediate (6 months - 2 years)</option>
                    <option value="Advanced">Advanced (2+ years consistent lifting)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Current Daily Activity
                  </label>
                  <select
                    value={training.currentActivity}
                    onChange={e => setTraining({ ...training, currentActivity: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="Sedentary">Sedentary (Desk work, &lt; 4,000 steps)</option>
                    <option value="Lightly Active">Lightly Active (4,000 - 7,000 steps)</option>
                    <option value="Moderately Active">Moderately Active (7,000 - 10,000 steps)</option>
                    <option value="Very Active">Very Active (Physical work, 10,000+ steps)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Preferred Training Location
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {['Speed Fit Gym', 'Home Workouts', 'Commercial Gym / Hybrid'].map(loc => {
                    const sel = training.location === loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setTraining({ ...training, location: loc })}
                        className={`p-3 min-h-[44px] rounded-xl border text-xs font-semibold transition-all ${
                          sel
                            ? 'bg-[#E10600] border-[#E10600] text-white shadow-sm'
                            : 'bg-[#1B1B20] border-[#2D2D38] text-gray-300 hover:text-white'
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Available Equipment <span className="text-[#E10600]">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Dumbbells',
                    'Barbells & Plates',
                    'Resistance Bands',
                    'Cable Machines',
                    'Full Gym Machines',
                    'Pull-up Bar',
                    'Kettlebells',
                    'Bodyweight Only'
                  ].map(eq => {
                    const selected = training.equipmentAccess.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-medium border transition-all ${
                          selected
                            ? 'bg-[#E10600] border-[#E10600] text-white'
                            : 'bg-[#1B1B20] border-[#2D2D38] text-gray-400 hover:text-white'
                        }`}
                      >
                        {eq} {selected && '✓'}
                      </button>
                    );
                  })}
                </div>
                {validationErrors.equipment && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.equipment}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Sessions Per Week Commitment
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['2', '3', '4', '5', '6'].map(n => {
                      const sel = training.sessionsPerWeek === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTraining({ ...training, sessionsPerWeek: n })}
                          className={`py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all ${
                            sel
                              ? 'bg-[#E10600] border-[#E10600] text-white shadow'
                              : 'bg-[#1B1B20] border-[#2D2D38] text-gray-400 hover:text-white'
                          }`}
                        >
                          {n}x
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Session Duration
                  </label>
                  <select
                    value={training.sessionLength}
                    onChange={e => setTraining({ ...training, sessionLength: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="30 mins">30 minutes (Express High-Density)</option>
                    <option value="45 mins">45 minutes (Standard EMS / Resistance)</option>
                    <option value="60 mins">60 minutes (Comprehensive Full Session)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Typical Daily Availability <span className="text-[#E10600]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Early Morning (6 AM - 9 AM)',
                    'Late Morning (9 AM - 12 PM)',
                    'Afternoon (12 PM - 4 PM)',
                    'Evening (5 PM - 8 PM)',
                    'Night (8 PM - 10 PM)',
                    'Weekends Only'
                  ].map(slot => {
                    const sel = training.availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleAvailability(slot)}
                        className={`p-3 min-h-[44px] rounded-xl border text-left text-xs font-medium transition-all ${
                          sel
                            ? 'bg-[#E10600]/15 border-[#E10600] text-white font-semibold'
                            : 'bg-[#1B1B20] border-[#2D2D38] text-gray-400 hover:text-white'
                        }`}
                      >
                        {slot} {sel && '✓'}
                      </button>
                    );
                  })}
                </div>
                {validationErrors.availability && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.availability}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: HEALTH CHECK (PAR-Q) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E10600] font-bold block mb-1">
                  Step 4 of 5
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-white">
                  Health Check (PAR-Q)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Physical Activity Readiness Questionnaire for your safety and joint protection.
                </p>
              </div>

              {/* Prominent Non-Medical Safety Notice */}
              <div className="bg-[#1C1A14] border border-amber-600/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Mandatory Health &amp; Safety Notice
                  </p>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    This fitness intake is <strong>not medical advice</strong>. Speed Fit training programs are physically demanding. If you answer "Yes" to any cardiovascular, joint, or medication questions below, your submission will be flagged for trainer review, and medical clearance from a licensed physician may be required prior to high-intensity training.
                  </p>
                </div>
              </div>

              {/* 7 PAR-Q Questions */}
              <div className="space-y-3.5">
                {[
                  {
                    key: 'heartCondition',
                    text: '1. Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?'
                  },
                  {
                    key: 'chestPainActive',
                    text: '2. Do you feel pain in your chest when you do physical activity?'
                  },
                  {
                    key: 'chestPainRest',
                    text: '3. In the past month, have you had chest pain when you were not doing physical activity?'
                  },
                  {
                    key: 'dizzinessOrBalance',
                    text: '4. Do you lose your balance because of dizziness or do you ever lose consciousness?'
                  },
                  {
                    key: 'boneOrJointIssue',
                    text: '5. Do you have a bone or joint problem (e.g., back, knee, shoulder) that could be made worse by physical exercise?'
                  },
                  {
                    key: 'bloodPressureOrHeartMeds',
                    text: '6. Is your doctor currently prescribing drugs (e.g. water pills, beta blockers) for your blood pressure or heart condition?'
                  },
                  {
                    key: 'otherReasonNoExercise',
                    text: '7. Do you know of any other reason why you should not do physical activity?'
                  }
                ].map(q => {
                  const isYes = (parq as any)[q.key] === true;
                  return (
                    <div 
                      key={q.key} 
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        isYes 
                          ? 'bg-red-950/20 border-red-500/60' 
                          : 'bg-[#1B1B20] border-[#2D2D38]'
                      }`}
                    >
                      <p className="text-xs text-gray-200 leading-relaxed mb-3">
                        {q.text}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setParq({ ...parq, [q.key]: false })}
                          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all ${
                            !isYes
                              ? 'bg-[#2E2E38] text-white border border-[#3E3E4C]'
                              : 'bg-transparent text-gray-400 hover:text-white'
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setParq({ ...parq, [q.key]: true })}
                          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                            isYes
                              ? 'bg-[#E10600] text-white shadow-md'
                              : 'bg-transparent text-gray-400 hover:text-white'
                          }`}
                        >
                          Yes {isYes && '⚠️'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasAnyParqFlag && (
                <div className="bg-red-950/30 border border-red-600/50 rounded-xl p-3 text-xs text-red-200 flex items-center gap-2 animate-in fade-in-50">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>One or more health indicators flagged. Your Speed Fit coach will review this specifically during your strategy call.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Injuries, Surgeries, or Medical Notes <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Lower back stiffness, past ACL reconstruction on left knee, mild asthma with inhaler..."
                  value={injuriesAndNotes}
                  onChange={e => setInjuriesAndNotes(e.target.value)}
                  className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 5: DAILY LIFE & CONSENT */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E10600] font-bold block mb-1">
                  Step 5 of 5
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-white">
                  Daily Life &amp; Consent
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Lifestyle habits directly impact your metabolic recovery and nutrition protocol.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Average Sleep Per Night
                  </label>
                  <select
                    value={dailyLife.sleepHours}
                    onChange={e => setDailyLife({ ...dailyLife, sleepHours: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="< 5 hours">&lt; 5 hours (Deficit)</option>
                    <option value="5-6 hours">5 - 6 hours</option>
                    <option value="7-8 hours">7 - 8 hours (Optimal)</option>
                    <option value="9+ hours">9+ hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Daily Water Intake
                  </label>
                  <select
                    value={dailyLife.waterIntakeLiters}
                    onChange={e => setDailyLife({ ...dailyLife, waterIntakeLiters: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="< 1 Liter">&lt; 1 Liter (Dehydrated)</option>
                    <option value="1-2 Liters">1 - 2 Liters</option>
                    <option value="2-3 Liters">2 - 3 Liters</option>
                    <option value="3+ Liters">3+ Liters (Optimal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Stress Level
                  </label>
                  <select
                    value={dailyLife.stressLevel}
                    onChange={e => setDailyLife({ ...dailyLife, stressLevel: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="Low">Low (Relaxed &amp; Manageable)</option>
                    <option value="Moderate">Moderate (Normal work stress)</option>
                    <option value="High">High (Demanding hours/projects)</option>
                    <option value="Extreme">Extreme (Chronic high cortisol)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Diet Preference
                  </label>
                  <select
                    value={dailyLife.dietPreference}
                    onChange={e => setDailyLife({ ...dailyLife, dietPreference: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="Non-Vegetarian">Non-Vegetarian (Chicken, Fish, Eggs)</option>
                    <option value="Vegetarian">Vegetarian (Dairy, Paneer, Dal)</option>
                    <option value="Eggetarian">Eggetarian (Veg + Eggs)</option>
                    <option value="Vegan">Vegan (100% Plant-Based)</option>
                    <option value="Jain">Jain Vegetarian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Tobacco / Smoking
                  </label>
                  <select
                    value={dailyLife.tobaccoUse}
                    onChange={e => setDailyLife({ ...dailyLife, tobaccoUse: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="None">None</option>
                    <option value="Occasional">Occasional / Social</option>
                    <option value="Regular">Regular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Alcohol Intake
                  </label>
                  <select
                    value={dailyLife.alcoholUse}
                    onChange={e => setDailyLife({ ...dailyLife, alcoholUse: e.target.value })}
                    className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="None">None</option>
                    <option value="Occasional">Occasional / Social (1-2x month)</option>
                    <option value="Regular">Regular (1+ times per week)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Food Allergies or Intolerances <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lactose intolerant, peanut allergy, gluten sensitivity..."
                  value={dailyLife.allergies}
                  onChange={e => setDailyLife({ ...dailyLife, allergies: e.target.value })}
                  className="w-full bg-[#1B1B20] border border-[#2D2D38] focus:border-[#E10600] rounded-xl px-4 py-3 min-h-[44px] text-sm text-white placeholder-gray-500 outline-none"
                />
              </div>

              {/* CONSENT CHECKBOX & LEGAL NOTICE */}
              <div className="pt-2 border-t border-[#262630]">
                <label className="flex items-start gap-3 p-3.5 bg-[#1B1B20] border border-[#2D2D38] rounded-2xl cursor-pointer hover:border-gray-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 min-w-[20px] accent-[#E10600] rounded cursor-pointer"
                  />
                  <div className="text-xs text-gray-300 leading-relaxed">
                    <span className="font-bold text-white block mb-0.5">Speed Fit Client Consent &amp; Verification *</span>
                    I confirm that the information provided in this assessment is true and accurate. I understand that Speed Fit training is physically demanding and that this intake is for fitness programming, <strong>not medical diagnosis</strong>. I consent to a Speed Fit performance coach contacting me directly via WhatsApp regarding my training schedule.
                  </div>
                </label>
                {validationErrors.consent && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.consent}</p>
                )}
              </div>

              {submitError && (
                <div className="bg-red-950/40 border border-red-600/60 rounded-xl p-3 text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}

          {/* BOTTOM NAVIGATION ACTIONS */}
          <div className="mt-8 pt-5 border-t border-[#262630] flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-3 min-h-[44px] bg-[#1B1B20] hover:bg-[#25252D] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 min-h-[44px] bg-[#E10600] hover:bg-[#FF3B30] text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_14px_rgba(225,6,0,0.3)] flex items-center gap-1.5 active:scale-95"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3.5 min-h-[44px] bg-[#E10600] hover:bg-[#FF3B30] disabled:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_18px_rgba(225,6,0,0.35)] flex items-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Securing Assessment...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Assessment</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#222228] bg-[#141417] px-4 py-4 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-gray-400">
          <p>SPEED FIT &copy; {new Date().getFullYear()} &mdash; BUILD TO TRANSFORM</p>
          <p className="text-gray-500">Certified Strength &amp; Biometrics Intake</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicAssessmentPage;
