import React from 'react';
import { DietPreferencesData } from '../../types';

interface Props {
  diet: Partial<DietPreferencesData>;
  onChange: (diet: Partial<DietPreferencesData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PREFERENCE_OPTIONS = [
  { value: 'Vegetarian', label: 'Vegetarian (Dairy, pulses, grains, fruits, vegetables)' },
  { value: 'Non-Vegetarian', label: 'Non-Vegetarian (Eggs, chicken, fish, mutton, dairy, plant foods)' },
  { value: 'Eggetarian', label: 'Eggetarian (Vegetarian + Eggs)' },
  { value: 'Vegan', label: 'Vegan (Strictly plant-based, no dairy or animal products)' }
];

const COMMON_ALLERGIES = [
  'Lactose / Milk Dairy',
  'Peanuts & Tree Nuts',
  'Gluten / Wheat',
  'Soy & Soy Products',
  'Eggs',
  'Fish & Seafood',
  'None'
];

const Step4DietPreferences: React.FC<Props> = ({ diet, onChange, onNext, onBack }) => {
  const currentPreference = diet.preference || 'Non-Vegetarian';
  const selectedAllergies = diet.foodAllergies || ['None'];
  const timings = diet.mealTimings || {
    breakfast: '08:30',
    lunch: '13:30',
    eveningSnack: '17:30',
    dinner: '21:00'
  };

  const toggleAllergy = (allergy: string) => {
    let updated: string[];
    if (allergy === 'None') {
      updated = ['None'];
    } else {
      updated = selectedAllergies.filter(a => a !== 'None');
      if (updated.includes(allergy)) {
        updated = updated.filter(a => a !== allergy);
        if (updated.length === 0) updated = ['None'];
      } else {
        updated.push(allergy);
      }
    }
    onChange({ ...diet, foodAllergies: updated });
  };

  const handleTimingChange = (key: keyof typeof timings, val: string) => {
    onChange({
      ...diet,
      mealTimings: {
        ...timings,
        [key]: val
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-neutral-700/60 pb-4 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF3B30] font-bold">Step 4 of 5</span>
        <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white mt-1">Diet Preferences</h3>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">Nutritional style, food intolerances, daily meal schedule, and dietary restrictions.</p>
      </div>

      {/* Primary Dietary Category */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Primary Dietary Preference *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PREFERENCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                currentPreference === opt.value
                  ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white'
                  : 'bg-[#1A1A1A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="preference"
                value={opt.value}
                checked={currentPreference === opt.value}
                onChange={() => onChange({ ...diet, preference: opt.value })}
                className="accent-[#FF3B30] mt-0.5"
              />
              <div>
                <span className="text-xs font-bold block">{opt.value}</span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">{opt.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Food Allergies */}
      <div className="space-y-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Known Food Allergies or Intolerances
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {COMMON_ALLERGIES.map((allergy) => {
            const isSelected = selectedAllergies.includes(allergy);
            return (
              <button
                type="button"
                key={allergy}
                onClick={() => toggleAllergy(allergy)}
                className={`p-3 rounded-xl border text-xs font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF3B30]/15 border-[#FF3B30] text-white font-bold'
                    : 'bg-[#1A1A1A] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <span>{allergy}</span>
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                  isSelected ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'border-neutral-700'
                }`}>
                  {isSelected && '✓'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Usual Meal Timings */}
      <div className="space-y-3">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Usual Meal Timings (IST)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase">Breakfast</span>
            <input
              type="time"
              value={timings.breakfast || '08:30'}
              onChange={(e) => handleTimingChange('breakfast', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3B30]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase">Lunch</span>
            <input
              type="time"
              value={timings.lunch || '13:30'}
              onChange={(e) => handleTimingChange('lunch', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3B30]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase">Snack / Pre-Gym</span>
            <input
              type="time"
              value={timings.eveningSnack || '17:30'}
              onChange={(e) => handleTimingChange('eveningSnack', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3B30]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase">Dinner</span>
            <input
              type="time"
              value={timings.dinner || '21:00'}
              onChange={(e) => handleTimingChange('dinner', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF3B30]"
            />
          </div>
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div className="space-y-1.5">
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
          Specific Dietary Restrictions or Eating Habits
        </label>
        <textarea
          rows={2}
          value={diet.dietaryRestrictions || ''}
          onChange={(e) => onChange({ ...diet, dietaryRestrictions: e.target.value })}
          className="w-full bg-[#1A1A1A] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF3B30] transition-colors resize-none font-sans"
          placeholder="e.g. Jain dietary laws (no onion/garlic), Halal, Intermittent Fasting (16:8), or tea/coffee intake frequency."
        />
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
          <span>Continue to Terms & Consent</span>
          <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default Step4DietPreferences;
