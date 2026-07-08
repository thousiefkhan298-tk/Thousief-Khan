import React, { useMemo, useState } from 'react';
import { HealthAssessment, ClientDetails } from '../../types';
import { calculateHealthMetrics, getBMIBarPercent, getBMIColor } from '../../utils/healthCalculations';
import { Activity, AlertTriangle, CheckCircle, AlertCircle, Info, Flame, Dumbbell, Camera } from 'lucide-react';

interface Props {
  assessment: Partial<HealthAssessment>;
  clientDetails: Partial<ClientDetails>;
  onChange: (assessment: Partial<HealthAssessment>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TRANSFORMATION_PATHS = [
  {
    id: 'Fat Loss',
    icon: Flame,
    title: 'Fat Loss',
    subtitle: 'Burn fat, reveal muscle, drop weight',
    duration: '8–16 weeks',
    color: '#FF0000',
    description: 'Progressive calorie deficit combined with resistance training and cardio. Designed for sustainable, healthy fat loss of 0.5–1 kg per week.',
    weeklySchedule: [
      { day: 'Mon', focus: 'Upper body strength + 20 min LISS cardio' },
      { day: 'Tue', focus: 'Lower body + 15 min HIIT finisher' },
      { day: 'Wed', focus: 'Back & biceps + 30 min steady-state cardio' },
      { day: 'Thu', focus: 'Full body circuit — 4 rounds, 45 sec/15 sec' },
      { day: 'Fri', focus: 'Legs & glutes heavy + 10 min core' },
      { day: 'Sat', focus: '25 min HIIT + foam rolling & stretch' },
      { day: 'Sun', focus: 'Active rest — 30 min walk, mobility' },
    ],
    macros: { protein: 40, carbs: 35, fat: 25 },
    keyFoods: 'Chicken, eggs, dals, brown rice, oats, leafy greens, paneer',
    avoid: 'Fried snacks, maida, sugary drinks, late-night eating',
  },
  {
    id: 'Muscle Gain',
    icon: Dumbbell,
    title: 'Muscle Gain',
    subtitle: 'Build size, increase strength, bulk smart',
    duration: '12–24 weeks',
    color: '#22c55e',
    description: 'Progressive overload hypertrophy training with a controlled caloric surplus. Maximize muscle protein synthesis while minimising fat gain.',
    weeklySchedule: [
      { day: 'Mon', focus: 'Chest & triceps — Bench 4×10, incline DB, dips, cable flies' },
      { day: 'Tue', focus: 'Back & biceps — Deadlift 4×6, rows, lat pulldown, curls' },
      { day: 'Wed', focus: 'Active rest — 20 min walk, light stretching' },
      { day: 'Thu', focus: 'Legs — Squat 5×5, leg press, Romanian DL, calf raises' },
      { day: 'Fri', focus: 'Shoulders & traps — OHP 4×8, lateral raises, face pulls' },
      { day: 'Sat', focus: 'Arms & core specialisation — Superset bi/tri' },
      { day: 'Sun', focus: 'Complete rest — sleep 8 hrs minimum' },
    ],
    macros: { protein: 35, carbs: 45, fat: 20 },
    keyFoods: 'Eggs, chicken, fish, whole milk, sweet potato, banana, oats, whey protein',
    avoid: 'Junk calories, alcohol, skipping post-workout nutrition',
  },
  {
    id: 'Ready to Shoot',
    icon: Camera,
    title: 'Ready to Shoot / Event',
    subtitle: 'Peak condition for photoshoot or wedding',
    duration: '12 weeks',
    color: '#FFD700',
    description: 'A 3-phase protocol combining fat loss, muscle definition, and peak conditioning for a specific date. Photoshoot, wedding, competition, or any major event.',
    weeklySchedule: [
      { day: 'Mon', focus: 'Upper push — high reps (15–20), short rest (45 sec)' },
      { day: 'Tue', focus: 'Lower body + 20 min HIIT — stairmaster or sprints' },
      { day: 'Wed', focus: 'Upper pull + 30 min fasted LISS cardio' },
      { day: 'Thu', focus: 'Full body metabolic circuit — 5 rounds, 8 exercises' },
      { day: 'Fri', focus: 'Lagging muscle focus + posing/movement practice' },
      { day: 'Sat', focus: '45 min cardio + full body stretch + skin prep' },
      { day: 'Sun', focus: 'Active rest — walk, hydrate, meal prep' },
    ],
    macros: { protein: 45, carbs: 35, fat: 20 },
    keyFoods: 'Lean meats, egg whites, asparagus, cucumber, grapefruit, green tea',
    avoid: 'Sodium-heavy foods, alcohol, processed carbs in final 2 weeks',
  },
];

const StepBMIReport: React.FC<Props> = ({ assessment, clientDetails, onChange, onNext, onBack }) => {
  const [selectedPath, setSelectedPath] = useState<string>(
    (assessment.goals || []).includes('Ready to Shoot') ? 'Ready to Shoot' :
    (assessment.goals || []).includes('Muscle Gain') ? 'Muscle Gain' : 'Fat Loss'
  );

  const metrics = useMemo(() => {
    const h = parseFloat(assessment.height || '0');
    const w = parseFloat(assessment.weight || '0');
    const a = parseInt(clientDetails.age || '25');
    const g = clientDetails.gender || 'Male';
    const occ = assessment.occupation || 'Sedentary';
    const stress = assessment.stress;
    if (!h || !w) return null;
    return calculateHealthMetrics(h, w, a, g, occ, stress);
  }, [assessment, clientDetails]);

  const handleConfirm = () => {
    onChange({
      ...assessment,
      goals: [selectedPath, ...(assessment.goals || []).filter(g => !['Fat Loss', 'Muscle Gain', 'Ready to Shoot'].includes(g))],
    });
    onNext();
  };

  if (!metrics) {
    return (
      <div className="text-center py-20">
        <p className="text-brand-red font-mono text-[10px] uppercase tracking-widest font-bold">Height & Weight Required</p>
        <p className="text-neutral-400 mt-2 text-sm">Please go back and enter your measurements.</p>
        <button onClick={onBack} className="mt-8 px-8 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all">← Go Back</button>
      </div>
    );
  }

  const bmiColor = getBMIColor(metrics.bmiCategory);
  const bmiBarPct = getBMIBarPercent(metrics.bmi);

  const FlagIcon = ({ type }: { type: string }) => {
    if (type === 'danger') return <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />;
    if (type === 'warning') return <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />;
    return <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />;
  };

  const flagBg = {
    danger: 'bg-red-950/50 border-red-800/50',
    warning: 'bg-yellow-950/50 border-yellow-800/50',
    success: 'bg-emerald-950/50 border-emerald-800/50',
    info: 'bg-blue-950/50 border-blue-800/50',
  };

  const activePath = TRANSFORMATION_PATHS.find(p => p.id === selectedPath)!;
  const PathIcon = activePath.icon;

  // Calories for active path
  const pathCalories = selectedPath === 'Fat Loss' ? metrics.fatLossCalories
    : selectedPath === 'Muscle Gain' ? metrics.leanGainCalories
    : metrics.aggressiveCutCalories;

  const pathProtein = Math.round(
    selectedPath === 'Muscle Gain' ? parseFloat(assessment.weight || '70') * 2.4
    : parseFloat(assessment.weight || '70') * 2.5
  );

  return (
    <div className="space-y-8">

      {/* === BMI SECTION === */}
      <div className="bg-neutral-950/50 border border-neutral-700 rounded-3xl p-7">
        <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold mb-5">BMI Analysis</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">BMI Score</p>
            <p className="text-4xl font-display italic text-white">{metrics.bmi}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: bmiColor }}>{metrics.bmiCategory}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">Ideal Weight</p>
            <p className="text-2xl font-display italic text-white">{metrics.idealWeightMin}–{metrics.idealWeightMax}<span className="text-base text-neutral-400"> kg</span></p>
            <p className="text-[8px] font-mono text-neutral-400 uppercase">for your height</p>
          </div>
          {metrics.weightToLose > 0 && (
            <div className="space-y-1">
              <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">To Lose</p>
              <p className="text-2xl font-display italic text-brand-red">{metrics.weightToLose}<span className="text-base text-neutral-400"> kg</span></p>
              <p className="text-[8px] font-mono text-neutral-400 uppercase">above ideal range</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">Metabolic Age</p>
            <p className={`text-2xl font-display italic ${metrics.metabolicAge > parseInt(clientDetails.age || '25') ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {metrics.metabolicAge}<span className="text-base text-neutral-400"> yrs</span>
            </p>
            <p className="text-[8px] font-mono text-neutral-400 uppercase">estimated</p>
          </div>
        </div>

        {/* BMI bar */}
        <div className="mb-2">
          <div className="h-3 bg-neutral-980 rounded-full overflow-hidden border border-neutral-750">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${bmiBarPct}%`, backgroundColor: bmiColor }}
            />
          </div>
          <div className="grid grid-cols-4 mt-2">
            {['Underweight <18.5', 'Normal 18.5–24.9', 'Overweight 25–29.9', 'Obese ≥30'].map((z, i) => (
              <p key={i} className="text-[8px] font-mono text-neutral-500 uppercase text-center">{z}</p>
            ))}
          </div>
        </div>
      </div>

      {/* === HEALTH FLAGS === */}
      {metrics.healthFlags.length > 0 && (
        <div className="space-y-3">
          <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold">Health Flags</p>
          {metrics.healthFlags.map((flag, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${flagBg[flag.type]}`}>
              <FlagIcon type={flag.type} />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest font-bold text-white mb-1">{flag.title}</p>
                <p className="text-sm text-neutral-300 leading-relaxed">{flag.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === BMR / METABOLIC RATE === */}
      <div className="bg-neutral-950/50 border border-neutral-700 rounded-3xl p-7">
        <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold mb-5">Metabolic Rate</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-neutral-800/50 p-5 rounded-2xl border border-neutral-700">
            <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest mb-2">BMR — Base Rate</p>
            <p className="text-3xl font-display italic text-white">{metrics.bmr.toLocaleString()}</p>
            <p className="text-[8px] font-mono text-neutral-400 uppercase mt-1">kcal/day at complete rest</p>
          </div>
          <div className="bg-neutral-800/50 p-5 rounded-2xl border border-brand-red/30">
            <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest mb-2">TDEE — Your Maintenance</p>
            <p className="text-3xl font-display italic text-brand-red">{metrics.tdee.toLocaleString()}</p>
            <p className="text-[8px] font-mono text-neutral-400 uppercase mt-1">kcal/day with your activity</p>
          </div>
        </div>

        <div className="space-y-0 divide-y divide-neutral-800">
          {[
            { label: 'Fat loss (aggressive)', val: metrics.aggressiveCutCalories, note: '−750 kcal deficit', color: '#ef4444' },
            { label: 'Fat loss (moderate)', val: metrics.fatLossCalories, note: '−500 kcal deficit', color: '#f59e0b' },
            { label: 'Maintenance', val: metrics.maintenanceCalories, note: 'weight stable', color: 'rgba(255,255,255,0.6)' },
            { label: 'Lean muscle gain', val: metrics.leanGainCalories, note: '+300 kcal surplus', color: '#22c55e' },
            { label: 'Bulk (mass gain)', val: metrics.bulkCalories, note: '+500 kcal surplus', color: '#3b82f6' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <span className="text-sm text-neutral-400">{row.label}</span>
              <div className="text-right">
                <span className="font-display italic text-lg font-bold" style={{ color: row.color }}>{row.val.toLocaleString()}</span>
                <span className="text-[8px] font-mono text-neutral-500 uppercase ml-2">{row.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === TRANSFORMATION PATH SELECTOR === */}
      <div>
        <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold mb-4">Choose Your Transformation Path</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {TRANSFORMATION_PATHS.map((path) => {
            const Icon = path.icon;
            const isSelected = selectedPath === path.id;
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => setSelectedPath(path.id)}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-2 bg-neutral-900/80 shadow-lg'
                    : 'border-neutral-700 bg-neutral-900/30 hover:border-neutral-500'
                }`}
                style={{
                  borderColor: isSelected ? path.color : undefined,
                  boxShadow: isSelected ? `0 0 20px ${path.color}20` : undefined,
                }}
              >
                <Icon className="w-5 h-5 mb-3" style={{ color: path.color }} />
                <p className="font-display italic uppercase text-white text-lg mb-1">{path.title}</p>
                <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mb-3">{path.subtitle}</p>
                <p className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: path.color }}>
                  {path.duration}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active path detail */}
        <div className="bg-neutral-950/50 border border-neutral-700 rounded-3xl p-7 space-y-6">
          <div className="flex items-start gap-4">
            <PathIcon className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: activePath.color }} />
            <div>
              <p className="font-display italic uppercase text-2xl text-white mb-1">{activePath.title} Protocol</p>
              <p className="text-sm text-neutral-400 leading-relaxed">{activePath.description}</p>
            </div>
          </div>

          {/* Personalized calorie target */}
          <div className="bg-neutral-900/50 border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4"
            style={{ borderColor: `${activePath.color}40` }}>
            <div>
              <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest mb-1">Daily Calories</p>
              <p className="text-2xl font-display italic" style={{ color: activePath.color }}>{pathCalories.toLocaleString()}</p>
              <p className="text-[8px] font-mono text-neutral-500 uppercase">kcal/day</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest mb-1">Protein</p>
              <p className="text-2xl font-display italic text-white">{pathProtein}g</p>
              <p className="text-[8px] font-mono text-neutral-500 uppercase">per day</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest mb-1">Macros</p>
              <p className="text-sm font-mono text-white">{activePath.macros.protein}P / {activePath.macros.carbs}C / {activePath.macros.fat}F</p>
              <p className="text-[8px] font-mono text-neutral-500 uppercase">% split</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest mb-1">Duration</p>
              <p className="text-sm font-mono text-white">{activePath.duration}</p>
              <p className="text-[8px] font-mono text-neutral-500 uppercase">recommended</p>
            </div>
          </div>

          {/* Diet notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-bold mb-2">Priority Foods</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{activePath.keyFoods}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-brand-red uppercase tracking-widest font-bold mb-2">Avoid</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{activePath.avoid}</p>
            </div>
          </div>

          {/* Weekly schedule */}
          <div>
            <p className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest font-bold mb-3">Weekly Training Schedule</p>
            <div className="space-y-0 divide-y divide-neutral-800">
              {activePath.weeklySchedule.map((day, i) => (
                <div key={i} className="grid grid-cols-[64px_1fr] gap-3 py-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-white">{day.day}</span>
                  <span className="text-sm text-neutral-400">{day.focus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-neutral-700">
        <button type="button" onClick={onBack}
          className="px-8 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest text-white font-bold hover:bg-neutral-800 transition-all">
          Back
        </button>
        <button type="button" onClick={handleConfirm}
          className="bg-brand-red text-white px-12 py-4 rounded-2xl font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(255,0,0,0.3)]">
          Lock In My Path →
        </button>
      </div>
    </div>
  );
};

export default StepBMIReport;
