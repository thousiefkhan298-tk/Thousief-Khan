import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Target, 
  CreditCard, 
  FileCheck, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  LogOut, 
  CheckCircle,
  Clock,
  Lock,
  Phone,
  Mail,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { PaymentRecord, TermsConsentData } from '../../../types';
import { TERMS_AND_CONDITIONS } from '../../../constants';
import { exportPaymentReceiptToPDF } from '../../../utils/pdfExporter';
import { useNavigate } from 'react-router-dom';

interface ClientProfileViewProps {
  userData: any;
  paymentRecords: PaymentRecord[];
  onLogout: () => void;
  initialSubTab?: 'profile' | 'assessments' | 'payments' | 'terms';
}

export const ClientProfileView: React.FC<ClientProfileViewProps> = ({
  userData,
  paymentRecords,
  onLogout,
  initialSubTab = 'profile'
}) => {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'profile' | 'assessments' | 'payments' | 'terms'>(initialSubTab);

  const clientDetails = userData?.clientDetails || {};
  const fitness = userData?.fitnessAssessment || userData?.healthAssessment || {};
  const medical = userData?.medicalAssessment || {};
  const diet = userData?.dietPreferences || {};
  const terms = userData?.termsConsent || {};

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Header and Sub-Tab Navigation */}
      <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-red text-white rounded-2xl flex items-center justify-center font-display text-2xl font-bold italic shadow-md shrink-0">
            {userData?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase text-white tracking-tight">
              {userData?.name || clientDetails.fullName || 'Client Profile'}
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              {userData?.email} • Role: <strong className="text-brand-red">{userData?.role || 'CLIENT'}</strong>
            </p>
          </div>
        </div>

        {/* Toggle Pills */}
        <div className="flex flex-wrap bg-neutral-900 border border-neutral-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSubTab('profile')}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'profile' ? 'bg-brand-red text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setSubTab('assessments')}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'assessments' ? 'bg-brand-red text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Assessments</span>
          </button>
          <button
            onClick={() => setSubTab('payments')}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'payments' ? 'bg-brand-red text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments</span>
          </button>
          <button
            onClick={() => setSubTab('terms')}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'terms' ? 'bg-brand-red text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Terms</span>
          </button>
        </div>
      </div>

      {/* 1. BASIC PROFILE */}
      {subTab === 'profile' && (
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in-50 duration-200">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold uppercase font-display text-white">Basic Personal Details</h3>
              <p className="text-xs text-neutral-400 font-mono">Your registered profile data.</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-neutral-900 hover:bg-rose-950/40 text-rose-400 border border-neutral-800 hover:border-rose-800 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase block">Full Legal Name</span>
              <p className="text-white font-bold text-sm">{clientDetails.fullName || userData?.name || 'N/A'}</p>
            </div>

            <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase block">Email Address</span>
              <p className="text-white font-bold text-sm">{userData?.email || clientDetails.email || 'N/A'}</p>
            </div>

            <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase block">Phone Number</span>
              <p className="text-white font-bold text-sm">{clientDetails.phoneNumber || userData?.phoneNumber || 'N/A'}</p>
            </div>

            <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase block">Date of Birth</span>
              <p className="text-white font-bold text-sm">{clientDetails.dob || 'Not provided'}</p>
            </div>

            <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase block">Occupation</span>
              <p className="text-white font-bold text-sm">{clientDetails.occupation || 'Not provided'}</p>
            </div>

            <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase block">Emergency Contact</span>
              <p className="text-white font-bold text-sm">{clientDetails.emergencyContact || 'Not provided'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. ASSESSMENTS */}
      {subTab === 'assessments' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Trainer Reopened Form Notice */}
          {userData?.assessmentReopened ? (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-amber-400 font-bold text-xs uppercase font-mono flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Trainer Reopened Intake Assessment</span>
                </span>
                <p className="text-xs text-neutral-300">
                  Your coach has requested an update to your assessment data. You can re-run and submit the onboarding flow.
                </p>
              </div>
              <button
                onClick={() => navigate('/onboarding')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase rounded-xl cursor-pointer shrink-0"
              >
                Update Assessment Now
              </button>
            </div>
          ) : (
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Submitted assessments are read-only. Contact your coach if you need to submit an update.</span>
              </div>
              <span className="text-emerald-400 font-bold uppercase text-[10px]">Locked & Archived</span>
            </div>
          )}

          {/* Fitness Assessment Card */}
          <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-bold uppercase font-display text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-red" />
              <span>Fitness Assessment</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase block">Height</span>
                <strong className="text-white text-sm">{fitness.height || 'N/A'} cm</strong>
              </div>
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase block">Weight</span>
                <strong className="text-white text-sm">{fitness.weight || 'N/A'} kg</strong>
              </div>
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase block">Experience</span>
                <strong className="text-white text-sm">{fitness.trainingExperience || 'Beginner'}</strong>
              </div>
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase block">Activity Level</span>
                <strong className="text-white text-sm">{fitness.activityLevel || 'Moderate'}</strong>
              </div>
            </div>

            {fitness.goals && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Fitness Goals</span>
                <p className="text-xs font-mono text-white">
                  {Array.isArray(fitness.goals) ? fitness.goals.join(', ') : fitness.goals}
                </p>
              </div>
            )}

            {fitness.equipment && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">Available Equipment</span>
                <p className="text-xs font-mono text-white">
                  {Array.isArray(fitness.equipment) ? fitness.equipment.join(', ') : fitness.equipment}
                </p>
              </div>
            )}
          </div>

          {/* Medical Assessment Card */}
          <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold uppercase font-display text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Medical Assessment & Health Disclosures</span>
              </h3>
              {medical.flaggedForReview && (
                <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase">
                  Flagged for Coach Oversight
                </span>
              )}
            </div>

            {medical.noKnownConditions ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-mono text-emerald-300">
                ✓ Client reported no known medical conditions, injuries, surgeries, or doctor-advised restrictions.
              </div>
            ) : (
              <div className="space-y-3 text-xs font-mono">
                {medical.conditions && medical.conditions.length > 0 && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Reported Conditions</span>
                    <p className="text-white font-bold">{medical.conditions.join(', ')}</p>
                  </div>
                )}
                {medical.injuriesOrSurgeries && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Injuries / Surgeries</span>
                    <p className="text-white">{medical.injuriesOrSurgeries}</p>
                  </div>
                )}
                {medical.painOrRestrictions && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Pain or Movement Restrictions</span>
                    <p className="text-white">
                      {Array.isArray(medical.painOrRestrictions) ? medical.painOrRestrictions.join(', ') : medical.painOrRestrictions}
                    </p>
                  </div>
                )}
                {medical.medications && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Medications</span>
                    <p className="text-white">{medical.medications}</p>
                  </div>
                )}
                {medical.allergies && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Allergies</span>
                    <p className="text-white">{medical.allergies}</p>
                  </div>
                )}
                {medical.doctorRestrictions && (
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Doctor Advised Restrictions</span>
                    <p className="text-white">{medical.doctorRestrictions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diet Preferences Card */}
          <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-bold uppercase font-display text-white border-b border-neutral-800 pb-3">
              Dietary Preferences & Habits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Preference</span>
                <p className="text-white font-bold text-sm">{diet.preference || 'Non-Vegetarian'}</p>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Food Allergies</span>
                <p className="text-white">
                  {Array.isArray(diet.foodAllergies) ? diet.foodAllergies.join(', ') : (diet.foodAllergies || 'None')}
                </p>
              </div>
              {diet.dietaryRestrictions && (
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-neutral-500 uppercase block">Dietary Restrictions</span>
                  <p className="text-white">{diet.dietaryRestrictions}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 3. PAYMENTS & BILLING */}
      {subTab === 'payments' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          
          <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold uppercase font-display text-white">Billing & Package Records</h3>
                <p className="text-xs text-neutral-400 font-mono">Package fees and payment receipts managed by your trainer.</p>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Read-Only</span>
            </div>

            {paymentRecords.length > 0 ? (
              <div className="space-y-4">
                {paymentRecords.map(record => {
                  const fee = Number(record.feeINR || record.amount || 0);
                  const paid = Number(record.amountPaid || 0);
                  const balance = record.outstandingBalance !== undefined ? Number(record.outstandingBalance) : Math.max(0, fee - paid);

                  return (
                    <div
                      key={record.id}
                      className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 space-y-4 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-2">
                        <div>
                          <h4 className="text-lg font-bold font-display uppercase text-white">
                            {record.packageName || record.package || 'Speed Fit Package'}
                          </h4>
                          <p className="text-[10px] font-mono text-neutral-500">
                            Billing Period: {record.billingPeriod || record.startDate || 'Standard'} • Due: <strong className="text-neutral-300">{record.dueDate || 'N/A'}</strong> • Renewal: <strong className="text-neutral-300">{record.renewalDate || (record.dueDate ? 'Scheduled after cycle' : 'N/A')}</strong>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase self-start sm:self-auto ${
                          record.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : record.status === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : record.status === 'Overdue'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        }`}>
                          {record.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                          <span className="text-[10px] text-neutral-500 uppercase block">Total Package Fee</span>
                          <strong className="text-white text-base">₹{fee.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                          <span className="text-[10px] text-neutral-500 uppercase block">Amount Settled</span>
                          <strong className="text-emerald-400 text-base">₹{paid.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                          <span className="text-[10px] text-neutral-500 uppercase block">Outstanding Balance</span>
                          <strong className={`text-base ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{balance.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      {/* Itemized partial payment transactions ledger */}
                      {record.transactions && record.transactions.length > 0 && (
                        <div className="space-y-2 bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800/80">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block">
                            Settlement Ledger ({record.transactions.length} Payment{record.transactions.length > 1 ? 's' : ''})
                          </span>
                          <div className="space-y-1.5">
                            {record.transactions.map((tx: any, idx: number) => (
                              <div key={tx.id || idx} className="flex justify-between items-center text-xs font-mono text-neutral-300 py-1 border-b border-neutral-800/50 last:border-b-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-400 font-bold">₹{Number(tx.amount || 0).toLocaleString('en-IN')}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[9px] uppercase">{tx.method || 'UPI'}</span>
                                  {tx.notes && <span className="text-neutral-500 text-[10px] italic">({tx.notes})</span>}
                                </div>
                                <span className="text-[10px] text-neutral-500">{tx.date || 'Recorded'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment references / transactions */}
                      {(record.referenceNumber || record.paymentDate) && !record.transactions?.length && (
                        <div className="text-xs font-mono text-neutral-400 bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between">
                          <span>Ref: <strong className="text-white">{record.referenceNumber || 'N/A'}</strong></span>
                          <span>Settled on: <strong className="text-white">{record.paymentDate || 'N/A'}</strong></span>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => exportPaymentReceiptToPDF(userData, record)}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-mono flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt (PDF)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono">
                No payment or package records created yet.
              </div>
            )}
          </div>

        </div>
      )}

      {/* 4. TERMS & CONSENT */}
      {subTab === 'terms' && (
        <div className="bg-[#141417] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in-50 duration-200">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-base font-bold uppercase font-display text-white">Speed Fit Training Agreement & Consent</h3>
              <p className="text-xs text-neutral-400 font-mono">Version {terms.termsVersion || '2.5'}</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold rounded-xl uppercase">
              Consent Verified
            </span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 max-h-64 overflow-y-auto text-xs text-neutral-300 leading-relaxed font-sans space-y-3 custom-scrollbar">
            {TERMS_AND_CONDITIONS.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block">Signed Legal Name</span>
              <p className="text-white font-bold text-sm">{terms.typedFullName || clientDetails.fullName || userData?.name || 'Verified'}</p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block">Execution Timestamp</span>
              <p className="text-white font-bold text-sm">{terms.acceptedAt || userData?.onboardingSubmittedAt || 'Active'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
