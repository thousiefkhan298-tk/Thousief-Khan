import React, { useState, useEffect } from 'react';
import { HealthAssessment, FitnessAssessment, MovementScreenScore } from '../types';
import { firebaseService } from '../services/firebaseService';
import { Edit2, Save, X, Plus, Trash2, CheckCircle, Activity, Heart, Ruler, ClipboardList, Target, ChevronRight, Info } from 'lucide-react';
import { format } from 'date-fns';

interface AssessmentsSectionProps {
  clientId: string;
  isTrainer: boolean;
  healthDoc: any;
  fitnessDoc: any;
}

const emptyScore = (): MovementScreenScore => ({ raw: '', final: '', comments: '' });

const AssessmentsSection: React.FC<AssessmentsSectionProps> = ({ clientId, isTrainer, healthDoc, fitnessDoc }) => {
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [isEditingFitness, setIsEditingFitness] = useState(false);
  
  const [healthForm, setHealthForm] = useState<Partial<HealthAssessment>>({});
  const [fitnessForm, setFitnessForm] = useState<Partial<FitnessAssessment>>({});

  useEffect(() => {
    if (healthDoc) setHealthForm(healthDoc);
    else setHealthForm({ conditions: [], goals: [] });
  }, [healthDoc]);

  useEffect(() => {
    if (fitnessDoc) {
      setFitnessForm(fitnessDoc);
    } else {
      setFitnessForm({
        clientId,
        date: format(new Date(), 'yyyy-MM-dd'),
        dob: '',
        gender: '',
        assessNum: '1',
        admin: '',
        height: '',
        weight: '',
        bodyFat: {
          triceps: '',
          chest: '',
          midAxillary: '',
          subScapular: '',
          abdomen: '',
          supraIliac: '',
          thigh: ''
        },
        circumference: {
          neck: '',
          shoulders: '',
          chest: '',
          waist: '',
          hips: '',
          rightThigh: '',
          leftThigh: '',
          rightUpperArm: '',
          leftUpperArm: ''
        },
        movementScreen: {
          deepSquat: emptyScore(),
          hurdleStepL: emptyScore(),
          hurdleStepR: emptyScore(),
          inlineLungeL: emptyScore(),
          inlineLungeR: emptyScore(),
          shoulderMobilityL: emptyScore(),
          shoulderMobilityR: emptyScore(),
          impingementL: emptyScore(),
          impingementR: emptyScore(),
          straightLegRaiseL: emptyScore(),
          straightLegRaiseR: emptyScore(),
          trunkStability: emptyScore(),
          pressUpClearing: emptyScore(),
          rotaryStabilityL: emptyScore(),
          rotaryStabilityR: emptyScore(),
          posteriorRocking: emptyScore(),
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
    }
  }, [fitnessDoc, clientId]);

  const handleSaveHealth = async () => {
    try {
      await firebaseService.saveHealthAssessment({ ...healthForm, clientId });
      setIsEditingHealth(false);
    } catch (error) {
      console.error("Error saving health assessment:", error);
    }
  };

  const handleSaveFitness = async () => {
    try {
      await firebaseService.saveFitnessAssessment({ ...fitnessForm, clientId });
      setIsEditingFitness(false);
    } catch (error) {
      console.error("Error saving fitness assessment:", error);
    }
  };

  const updateFitnessField = (section: keyof FitnessAssessment, field: string, value: string) => {
    const currentSection = (fitnessForm[section] as any) || {};
    setFitnessForm({
      ...fitnessForm,
      [section]: {
        ...currentSection,
        [field]: value
      }
    });
  };

  const updateMovementScore = (test: string, field: 'raw' | 'final' | 'comments', value: string) => {
    const movementScreen = { ...(fitnessForm.movementScreen || {}) } as any;
    if (!movementScreen[test]) movementScreen[test] = emptyScore();
    movementScreen[test] = {
      ...movementScreen[test],
      [field]: value
    };
    setFitnessForm({ ...fitnessForm, movementScreen });
  };

  const renderHealthAssessment = () => {
    // Health assessment rendering remains mostly same but polished
    if (isEditingHealth) {
      return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-8 space-y-6 shadow-2xl">
           {/* ... existing health form logic simplified for brevity but functional ... */}
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display italic uppercase tracking-widest text-white flex items-center">
                <Heart className="w-5 h-5 mr-3 text-brand-red" />
                Medical & Lifestyle Dossier
              </h3>
              <button onClick={() => setIsEditingHealth(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-all">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest text-brand-red font-bold">Vital Statistics</label>
                <div className="grid grid-cols-2 gap-4">
                   {['height', 'weight', 'waist'].map(field => (
                     <div key={field}>
                        <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">{field}</label>
                        <input 
                          type="text" 
                          value={(healthForm as any)[field] || ''} 
                          onChange={e => setHealthForm({...healthForm, [field]: e.target.value})}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:border-brand-red outline-none"
                        />
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono uppercase tracking-widest text-brand-red font-bold">Psychographics</label>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">Stress</label>
                      <select value={healthForm.stress || ''} onChange={e => setHealthForm({...healthForm, stress: e.target.value as any})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:border-brand-red outline-none">
                        <option value="">Select</option>
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">Activity</label>
                      <select value={healthForm.occupation || ''} onChange={e => setHealthForm({...healthForm, occupation: e.target.value as any})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:border-brand-red outline-none">
                        <option value="">Select</option>
                        <option value="Active">Active</option>
                        <option value="Sedentary">Sedentary</option>
                      </select>
                   </div>
                </div>
              </div>
           </div>

           <button 
             onClick={handleSaveHealth}
             className="w-full bg-brand-red text-white font-mono font-bold uppercase tracking-widest py-4 rounded-2xl hover:bg-red-700 transition-all shadow-[0_0_30px_rgba(255,0,0,0.2)]"
           >
             Commit Health Records
           </button>
        </div>
      );
    }

    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-red/5 -mr-24 -mt-24 rounded-full blur-3xl"></div>
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center space-x-3">
            <Heart className="w-5 h-5 text-brand-red" />
            <h3 className="text-2xl font-display italic uppercase tracking-wider text-white">Health Baseline</h3>
          </div>
          {isTrainer && (
            <button onClick={() => setIsEditingHealth(true)} className="p-2 bg-neutral-800/50 text-neutral-400 hover:text-brand-red rounded-xl transition-all border border-neutral-800">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {!healthDoc ? (
          <div className="py-12 text-center border border-dashed border-neutral-800 rounded-3xl">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 italic font-bold">Diagnostic data pending.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
            {[
              { label: 'HEIGHT', value: `${healthDoc.height || '--'} cm`, icon: <Ruler className="w-3 h-3" /> },
              { label: 'WEIGHT', value: `${healthDoc.weight || '--'} kg`, icon: <Activity className="w-3 h-3" /> },
              { label: 'STRESS', value: healthDoc.stress || '--', icon: <Target className="w-3 h-3 text-red-500" /> },
            ].map(stat => (
              <div key={stat.label} className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-neutral-500">{stat.icon}</span>
                  <span className="text-[7px] font-mono text-brand-red uppercase tracking-widest font-bold">{stat.label}</span>
                </div>
                <div className="text-lg font-display italic text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFitnessAssessment = () => {
    if (isEditingFitness) {
      return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 space-y-10 shadow-2xl">
          <div className="flex justify-between items-center bg-neutral-950 -mx-8 -mt-8 p-8 border-b border-neutral-800 rounded-t-[2.5rem]">
            <div className="flex flex-col">
              <h3 className="text-3xl font-display italic uppercase tracking-wider text-white">Physical Diagnostic Laboratory</h3>
              <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-bold">New Assessment Entry</p>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setIsEditingFitness(false)} className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-500 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSaveFitness}
                className="px-6 py-3 bg-emerald-600 text-white font-mono font-bold uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Log Data
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-4">
                <h4 className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-4 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-emerald-500" />
                  General Metrics
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">DOB</label>
                    <input type="text" value={fitnessForm.dob || ''} onChange={e => setFitnessForm({...fitnessForm, dob: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500" placeholder="YYYY-MM-DD" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">Gender</label>
                      <input type="text" value={fitnessForm.gender || ''} onChange={e => setFitnessForm({...fitnessForm, gender: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">Assess #</label>
                      <input type="text" value={fitnessForm.assessNum || ''} onChange={e => setFitnessForm({...fitnessForm, assessNum: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">Administered By</label>
                    <input type="text" value={fitnessForm.admin || ''} onChange={e => setFitnessForm({...fitnessForm, admin: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500" />
                  </div>
                </div>
            </div>

            <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-4 md:col-span-2">
               <h4 className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-4 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-emerald-500" />
                  Body Fat Skinfold (mm)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {['triceps', 'chest', 'midAxillary', 'subScapular', 'abdomen', 'supraIliac', 'thigh'].map(field => (
                     <div key={field}>
                        <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">{field}</label>
                        <input 
                          type="text" 
                          value={fitnessForm.bodyFat?.[field as keyof typeof fitnessForm.bodyFat] || ''} 
                          onChange={e => updateFitnessField('bodyFat', field, e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500"
                        />
                     </div>
                   ))}
                </div>
            </div>
          </div>

          <div className="bg-neutral-950 p-8 rounded-[2rem] border border-neutral-800 space-y-6">
             <h4 className="text-[11px] font-mono uppercase tracking-widest text-white font-bold flex items-center">
                <Ruler className="w-4 h-4 mr-2 text-emerald-500" />
                Circumference Measurements (inches)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                 {['neck', 'shoulders', 'chest', 'waist', 'hips', 'rightThigh', 'leftThigh', 'rightUpperArm', 'leftUpperArm'].map(field => (
                   <div key={field}>
                      <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-1 ml-1">{field.replace(/([A-Z])/g, ' $1')}</label>
                      <input 
                        type="text" 
                        value={fitnessForm.circumference?.[field as keyof typeof fitnessForm.circumference] || ''} 
                        onChange={e => updateFitnessField('circumference', field, e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500"
                      />
                   </div>
                 ))}
              </div>
          </div>

          <div className="space-y-6">
             <h4 className="text-[11px] font-mono uppercase tracking-widest text-white font-bold flex items-center">
                <ClipboardList className="w-4 h-4 mr-2 text-emerald-500" />
                Movement Screen Table
              </h4>
              <div className="overflow-x-auto border border-neutral-800 rounded-2xl bg-neutral-950">
                <table className="w-full text-left font-mono text-[10px]">
                  <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-3 uppercase tracking-widest font-bold">TEST</th>
                      <th className="px-4 py-3 uppercase tracking-widest font-bold w-24">RAW</th>
                      <th className="px-4 py-3 uppercase tracking-widest font-bold w-24">FINAL</th>
                      <th className="px-4 py-3 uppercase tracking-widest font-bold">COMMENTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {[
                      { id: 'deepSquat', label: 'DEEP SQUAT' },
                      { id: 'hurdleStepL', label: 'HURDLE STEP (L)' },
                      { id: 'hurdleStepR', label: 'HURDLE STEP (R)' },
                      { id: 'inlineLungeL', label: 'INLINE LUNGE (L)' },
                      { id: 'inlineLungeR', label: 'INLINE LUNGE (R)' },
                      { id: 'shoulderMobilityL', label: 'SHOULDER MOBILITY (L)' },
                      { id: 'shoulderMobilityR', label: 'SHOULDER MOBILITY (R)' },
                      { id: 'impingementL', label: 'IMPINGEMENT CLEARING (L)' },
                      { id: 'impingementR', label: 'IMPINGEMENT CLEARING (R)' },
                      { id: 'straightLegRaiseL', label: 'ASLR (L)' },
                      { id: 'straightLegRaiseR', label: 'ASLR (R)' },
                      { id: 'trunkStability', label: 'TRUNK STABILITY PUSHUP' },
                      { id: 'pressUpClearing', label: 'PRESS-UP CLEARING' },
                      { id: 'rotaryStabilityL', label: 'ROTARY STABILITY (L)' },
                      { id: 'rotaryStabilityR', label: 'ROTARY STABILITY (R)' },
                      { id: 'posteriorRocking', label: 'POSTERIOR ROCKING' },
                    ].map(test => (
                      <tr key={test.id}>
                        <td className="px-4 py-2 font-bold text-neutral-300">{test.label}</td>
                        <td className="px-2 py-2">
                          <input 
                            type="text" 
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-center text-white" 
                            value={(fitnessForm.movementScreen?.[test.id as keyof typeof fitnessForm.movementScreen] as MovementScreenScore)?.raw || ''}
                            onChange={e => updateMovementScore(test.id, 'raw', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                           <input 
                            type="text" 
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-center text-white font-bold" 
                            value={(fitnessForm.movementScreen?.[test.id as keyof typeof fitnessForm.movementScreen] as MovementScreenScore)?.final || ''}
                            onChange={e => updateMovementScore(test.id, 'final', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                           <input 
                            type="text" 
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-1 text-white" 
                            value={(fitnessForm.movementScreen?.[test.id as keyof typeof fitnessForm.movementScreen] as MovementScreenScore)?.comments || ''}
                            onChange={e => updateMovementScore(test.id, 'comments', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-900/50">
                       <td className="px-4 py-4 font-black text-white text-[12px]">TOTAL SCORE</td>
                       <td></td>
                       <td className="px-2 py-2">
                          <input 
                            type="text" 
                            className="w-full bg-brand-red text-white border-none rounded px-2 py-2 text-center font-black" 
                            value={fitnessForm.movementScreen?.totalScore || ''}
                            onChange={e => setFitnessForm({...fitnessForm, movementScreen: { ...fitnessForm.movementScreen, totalScore: e.target.value } as any})}
                          />
                       </td>
                       <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-6">
                <h4 className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-4 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-emerald-500" />
                  Physical Tests
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 font-bold">3-Minute Step Test (BPM)</span>
                    <input type="text" value={fitnessForm.physicalTests?.stepTestBpm || ''} onChange={e => updateFitnessField('physicalTests', 'stepTestBpm', e.target.value)} className="bg-transparent text-right outline-none font-display italic text-emerald-500 text-xl w-20" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <span className="text-[9px] font-mono uppercase text-neutral-500 font-bold">Air Dyne (Cal/Min)</span>
                      <input type="text" value={fitnessForm.physicalTests?.calorieBurnAirDyne || ''} onChange={e => updateFitnessField('physicalTests', 'calorieBurnAirDyne', e.target.value)} className="bg-transparent text-right outline-none font-display italic text-white text-xl w-20" />
                    </div>
                    <div className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <span className="text-[9px] font-mono uppercase text-neutral-500 font-bold">Max Wall Sit (Time)</span>
                      <input type="text" value={fitnessForm.physicalTests?.maximalWallSitTime || ''} onChange={e => updateFitnessField('physicalTests', 'maximalWallSitTime', e.target.value)} className="bg-transparent text-right outline-none font-display italic text-white text-xl w-32" />
                    </div>
                  </div>
                   <div className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 font-bold">Push-Ups (Max)</span>
                    <input type="text" value={fitnessForm.physicalTests?.pushUps || ''} onChange={e => updateFitnessField('physicalTests', 'pushUps', e.target.value)} className="bg-transparent text-right outline-none font-display italic text-white text-xl w-20" />
                  </div>
                   <div className="flex justify-between items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 font-bold">Max Plank (Time)</span>
                    <input type="text" value={fitnessForm.physicalTests?.maximalPlankTime || ''} onChange={e => updateFitnessField('physicalTests', 'maximalPlankTime', e.target.value)} className="bg-transparent text-right outline-none font-display italic text-white text-xl w-32" />
                  </div>
                </div>
            </div>

            <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800 space-y-4 flex flex-col">
                <h4 className="text-[11px] font-mono uppercase tracking-widest text-white font-bold mb-4 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-emerald-500" />
                  Posture & Analysis
                </h4>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-2 ml-1">Posture Analysis Observation</label>
                    <textarea 
                      value={fitnessForm.postureAnalysis || ''} 
                      onChange={e => setFitnessForm({...fitnessForm, postureAnalysis: e.target.value})}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 font-mono text-xs text-white outline-none focus:border-emerald-500 h-32"
                      placeholder="Ideal alignment, Kyphotic-lordotic, Flat-back, Sway-back..."
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-neutral-500 uppercase mb-2 ml-1">General Notes</label>
                    <textarea 
                      value={fitnessForm.notes || ''} 
                      onChange={e => setFitnessForm({...fitnessForm, notes: e.target.value})}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 font-mono text-xs text-white outline-none focus:border-emerald-500 h-32"
                    />
                  </div>
                </div>
            </div>
          </div>

          <div className="pt-10 flex justify-end">
            <button 
              onClick={handleSaveFitness}
              className="px-12 py-5 bg-emerald-600 text-white font-mono font-bold uppercase tracking-widest rounded-[2rem] hover:bg-emerald-700 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] transform hover:scale-[1.02] active:scale-95"
            >
              Commit Comprehensive Assessment
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 -mr-32 -mt-32 rounded-full blur-[100px]"></div>
        <div className="flex justify-between items-start mb-12 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Activity className="w-6 h-6 text-emerald-500" />
              <h3 className="text-3xl font-display italic uppercase tracking-wider text-white">Fitness DNA Assessment</h3>
            </div>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-bold">Detailed performance and structural analytics</p>
          </div>
          {isTrainer && (
            <button onClick={() => setIsEditingFitness(true)} className="flex items-center space-x-2 px-6 py-2 bg-neutral-800 border border-neutral-700 text-white font-mono text-[10px] uppercase font-bold tracking-widest rounded-full hover:bg-neutral-700 transition-all">
              <Edit2 className="w-3 h-3" />
              <span>Edit Evaluation</span>
            </button>
          )}
        </div>

        {!fitnessDoc ? (
          <div className="py-24 text-center border border-dashed border-neutral-800 rounded-[2rem]">
            <Activity className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 font-bold italic">Awaiting initial fitness screening.</p>
          </div>
        ) : (
          <div className="space-y-12 relative z-10">
            {/* Display Read-only data summarized elegantly */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {fitnessDoc.bodyFat && Object.entries(fitnessDoc.bodyFat).map(([key, val]) => (
                <div key={key} className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-center">
                  <span className="text-[7px] font-mono text-emerald-500 uppercase tracking-widest block mb-1">{key}</span>
                  <span className="text-xl font-display italic text-white">{val as string || '0'}<span className="text-[8px] font-mono not-italic ml-0.5 text-neutral-500">MM</span></span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-6">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold border-b border-neutral-800 pb-2">Movement Scoreboard</h4>
                  <div className="bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800">
                     <div className="grid grid-cols-12 bg-neutral-900 px-4 py-2 text-[8px] font-mono uppercase text-neutral-500 font-bold">
                        <div className="col-span-8">Test Name</div>
                        <div className="col-span-2 text-center">Raw</div>
                        <div className="col-span-2 text-center">Final</div>
                     </div>
                     <div className="divide-y divide-neutral-900">
                        {Object.entries(fitnessDoc.movementScreen || {}).filter(([k]) => k !== 'totalScore').slice(0, 5).map(([id, score]: [string, any]) => (
                          <div key={id} className="grid grid-cols-12 px-4 py-3 text-[10px] font-mono">
                             <div className="col-span-8 text-neutral-400 font-bold">{id.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                             <div className="col-span-2 text-center text-neutral-500">{score.raw || '-'}</div>
                             <div className="col-span-2 text-center text-white font-bold">{score.final || '-'}</div>
                          </div>
                        ))}
                     </div>
                     <div className="p-4 bg-emerald-950/20 border-t border-emerald-900/30 flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase text-white font-black tracking-widest">Composite FMS Score</span>
                        <span className="text-2xl font-display italic text-emerald-500">{fitnessDoc.movementScreen?.totalScore || 'N/A'}</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold border-b border-neutral-800 pb-2">Physical Performance</h4>
                  <div className="grid grid-cols-2 gap-4">
                     {[
                       { label: 'STEP TEST', value: `${fitnessDoc.physicalTests?.stepTestBpm || '--'} BPM`, icon: <Heart className="w-3 h-3 text-brand-red" /> },
                       { label: 'PUSH UPS', value: fitnessDoc.physicalTests?.pushUps || '--', icon: <CheckCircle className="w-3 h-3 text-emerald-500" /> },
                       { label: 'MAX PLANK', value: fitnessDoc.physicalTests?.maximalPlankTime || '--', icon: <Activity className="w-3 h-3 text-white" /> },
                       { label: 'WALL SIT', value: fitnessDoc.physicalTests?.maximalWallSitTime || '--', icon: <Activity className="w-3 h-3 text-white" /> },
                     ].map(p => (
                       <div key={p.label} className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800">
                          <div className="flex items-center space-x-2 mb-2">
                             {p.icon}
                             <span className="text-[7px] font-mono uppercase tracking-widest font-black text-neutral-500">{p.label}</span>
                          </div>
                          <div className="text-xl font-display italic text-white">{p.value}</div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-neutral-800 flex justify-between items-center">
              <div className="flex space-x-8">
                 <div className="flex flex-col">
                    <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-bold mb-1">Last Review</span>
                    <span className="text-[10px] font-mono text-white font-bold">{fitnessDoc.updatedAt ? format(new Date(fitnessDoc.updatedAt), 'MMM dd, yyyy') : 'N/A'}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest font-bold mb-1">Evaluator</span>
                    <span className="text-[10px] font-mono text-white font-bold">{fitnessDoc.admin || 'System'}</span>
                 </div>
              </div>
              <p className="text-[9px] font-mono text-neutral-500 italic max-w-sm text-right">
                {fitnessDoc.notes || 'No specialized observations recorded for this session.'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {renderHealthAssessment()}
      {renderFitnessAssessment()}
    </div>
  );
};

export default AssessmentsSection;
