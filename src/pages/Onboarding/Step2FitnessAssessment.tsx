import React from 'react';
import { FitnessAssessmentData } from '../../types';

interface Props {
  fitness: Partial<FitnessAssessmentData>;
  onChange: (fitness: Partial<FitnessAssessmentData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const GOAL_OPTIONS = [
  'Fat Loss & Weight Management',
  'Muscle Hypertrophy & Strength',
  'Body Recomposition & Toning',
  'Cardiovascular Endurance & Stamina',
  'Mobility, Posture & Flexibility',
  'Athletic Performance & Speed'
];

const EXPERIENCE_OPTIONS = [
  { value: 'Beginner', label: 'Beginner (0-6 months training experience)' },
  { value: 'Intermediate', label: 'Intermediate (6 months to 2 years consistent training)' },
  { value: 'Advanced', label: 'Advanced (2+ years dedicated strength/fitness experience)' }
];

const ACTIVITY_LEVELS = [
  { value: 'Sedentary', label: 'Sedentary (Little or no exercise, mostly sitting)' },
  { value: 'Lightly Active', label: 'Lightly Active (Light exercise 1-3 days/week)' },
  { value: 'Moderately Active', label: 'Moderately Active (Moderate exercise 3-5 days/week)' },
  { value: 'Very Active', label: 'Very Active (Heavy exercise 6-7 days/week)' }
];

const EQUIPMENT_OPTIONS = [
  'Full Gym (Barbells, Dumbbells, Machines, Cables)',
  'Home Dumbbells & Bench',
  'Resistance Bands & Suspension',
  'Bodyweight / Calisthenics Only',
  'EMS (Electro Muscle Stimulation)'
];

const TIME_OPTIONS = [
  'Early Morning (6:00 AM - 8:00 AM)',
  'Morning (8:00 AM - 11:00 AM)',
  'Afternoon (12:00 PM - 4:00 PM)',
  'Evening (4:00 PM - 7:00 PM)',
  'Night (7:00 PM - 9:30 PM)'
];

const Step2FitnessAssessment: React.FC<Props> = ({ fitness, onChange, onNext, onBack }) => {
  const selectedGoals = fitness.goals || [];
  const selectedEquipment = fitness.equipment || [];
  const selectedTimes = fitness.preferredTrainingTimes || [];

  const toggleGoal = (goal: string) => {
    const updated = selectedGoals.includes(goal)
      ? selectedGoals.filter(g => g !== goal)
      : [...selectedGoals, goal];
    onChange({ ...fitness, goals: updated });
  };

  const toggleEquipment = (eq: string) => {
    const updated = selectedEquipment.includes(eq)
      ? selectedEquipment.filter(e => e !== eq)
      : [...selectedEquipment, eq];
    onChange({ ...fitness, equipment: updated });
  };

  const toggleTime = (t: string) => {
    const updated = selectedTimes.includes(t)
      ? selectedTimes.filter(item => item !== t)
      : [...selectedTimes, t];
    onChange({ ...fitness, preferredTrainingTimes: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoals.length === 0) {
      alert('Please select at least one primary fitness goal.');
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-neutral-700/60 pb-4 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF3B30] font-bold">Step 2 of 5</span>
        <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white mt-1">Fitness Assessment</h3>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">Physical dimensions, targets, training background, and equipment availability.</p>
      </div>

      {/* Height and Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Height (cm) *</label>
          <input
            required
            type="number"
            min="80"
            max="250"
            value={fitness.height || ''}
            onChange={(e) => onChange({ ...fitness, height: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
            placeholder="e.g. 175"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">Current Weight (kg) *</label>
          <input
            required
            type="number"
            min="30"
            max="300"
            step="0.1"
            value={fitness.weight || ''}
            onChange={(e) => onChange({ ...fitness, weight: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors"
            placeholder="e.g. 74.5"
          />
        </div>
      </div>

      {/* Fitness Goals */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Primary Fitness Goals * (Select all that apply)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {GOAL_OPTIONS.map((goal) => {
            const isSelected = selectedGoals.includes(goal);
            return (
              <button
                type="button"
                key={goal}
                onClick={() => toggleGoal(goal)}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white font-semibold'
                    : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span>{goal}</span>
                <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                  isSelected ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'border-neutral-600'
                }`}>
                  {isSelected && '✓'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Training Experience */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Training Experience *
        </label>
        <div className="space-y-2">
          {EXPERIENCE_OPTIONS.map((exp) => (
            <label
              key={exp.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                fitness.trainingExperience === exp.value
                  ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white'
                  : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="trainingExperience"
                value={exp.value}
                checked={fitness.trainingExperience === exp.value}
                onChange={() => onChange({ ...fitness, trainingExperience: exp.value })}
                className="accent-[#FF3B30]"
              />
              <span className="text-xs">{exp.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Current Activity Level */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Current Activity Level *
        </label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((act) => (
            <label
              key={act.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                fitness.activityLevel === act.value
                  ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white'
                  : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="activityLevel"
                value={act.value}
                checked={fitness.activityLevel === act.value}
                onChange={() => onChange({ ...fitness, activityLevel: act.value })}
                className="accent-[#FF3B30]"
              />
              <span className="text-xs">{act.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Available Equipment */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Available Training Equipment
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {EQUIPMENT_OPTIONS.map((eq) => {
            const isSelected = selectedEquipment.includes(eq);
            return (
              <button
                type="button"
                key={eq}
                onClick={() => toggleEquipment(eq)}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white'
                    : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span>{eq}</span>
                <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                  isSelected ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'border-neutral-600'
                }`}>
                  {isSelected && '✓'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Training Times */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Preferred Training Times (IST)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TIME_OPTIONS.map((time) => {
            const isSelected = selectedTimes.includes(time);
            return (
              <button
                type="button"
                key={time}
                onClick={() => toggleTime(time)}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white'
                    : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span>{time}</span>
                <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                  isSelected ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'border-neutral-600'
                }`}>
                  {isSelected && '✓'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="bg-[#FF3B30] hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Medical Assessment</span>
          <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default Step2FitnessAssessment;
