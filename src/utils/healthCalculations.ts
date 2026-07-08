export interface HealthMetrics {
  bmi: number;
  bmiCategory: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  bmiRisk: 'low' | 'moderate' | 'high' | 'severe';
  idealWeightMin: number;
  idealWeightMax: number;
  weightToLose: number; // kg above ideal range (0 if already in range)
  bmr: number; // Mifflin-St Jeor
  tdee: number; // BMR × activity multiplier
  metabolicAge: number; // estimated metabolic age based on BMR vs average
  fatLossCalories: number;   // tdee - 500
  aggressiveCutCalories: number; // tdee - 750
  maintenanceCalories: number;
  leanGainCalories: number;  // tdee + 300
  bulkCalories: number;      // tdee + 500
  dailyProtein: number;      // g/day (2.2 × bodyweight for fat loss)
  healthFlags: HealthFlag[];
}

export interface HealthFlag {
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  'Sedentary': 1.2,
  'Active': 1.55,
};

export function calculateHealthMetrics(
  heightCm: number,
  weightKg: number,
  age: number,
  gender: 'Male' | 'Female' | string,
  occupation: 'Sedentary' | 'Active' | string,
  stress?: 'Low' | 'Moderate' | 'High'
): HealthMetrics {
  const hm = heightCm / 100;

  // BMI
  const bmi = Math.round((weightKg / (hm * hm)) * 10) / 10;
  let bmiCategory: HealthMetrics['bmiCategory'];
  let bmiRisk: HealthMetrics['bmiRisk'];
  if (bmi < 18.5) { bmiCategory = 'Underweight'; bmiRisk = 'moderate'; }
  else if (bmi < 25) { bmiCategory = 'Normal'; bmiRisk = 'low'; }
  else if (bmi < 30) { bmiCategory = 'Overweight'; bmiRisk = 'moderate'; }
  else { bmiCategory = 'Obese'; bmiRisk = bmi >= 35 ? 'severe' : 'high'; }

  // Ideal weight (BMI 18.5–24.9)
  const idealWeightMin = Math.round(18.5 * hm * hm);
  const idealWeightMax = Math.round(24.9 * hm * hm);
  const weightToLose = Math.max(0, Math.round((weightKg - idealWeightMax) * 10) / 10);

  // BMR — Mifflin-St Jeor
  let bmr: number;
  if (gender === 'Male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  bmr = Math.round(bmr);

  // TDEE
  const activityMultiplier = ACTIVITY_MULTIPLIERS[occupation] || 1.375;
  const tdee = Math.round(bmr * activityMultiplier);

  // Metabolic age estimate
  // Average BMR for age: male baseline ~1800 at 25, decreasing ~15 kcal/yr
  // Female baseline ~1500 at 25, decreasing ~12 kcal/yr
  const baseBMR = gender === 'Male' ? 1800 : 1500;
  const decayRate = gender === 'Male' ? 15 : 12;
  const metabolicAge = Math.round(25 + (baseBMR - bmr) / decayRate);

  // Calorie targets
  const fatLossCalories = tdee - 500;
  const aggressiveCutCalories = tdee - 750;
  const maintenanceCalories = tdee;
  const leanGainCalories = tdee + 300;
  const bulkCalories = tdee + 500;
  const dailyProtein = Math.round(weightKg * 2.2);

  // Health flags
  const healthFlags: HealthFlag[] = [];

  if (bmi >= 30) {
    healthFlags.push({
      type: 'danger',
      title: 'Obesity-range BMI',
      message: `BMI of ${bmi} indicates obesity. This increases risk of type 2 diabetes, hypertension, and joint stress. Medical clearance is recommended before high-intensity training. Fat loss is the immediate priority.`,
    });
  } else if (bmi >= 25) {
    healthFlags.push({
      type: 'warning',
      title: 'Overweight range',
      message: `You are ${weightToLose} kg above the healthy weight range for your height. A 500 kcal daily deficit will produce safe, steady fat loss of ~0.5 kg per week.`,
    });
  } else if (bmi < 18.5) {
    healthFlags.push({
      type: 'warning',
      title: 'Underweight',
      message: 'Low body weight risks muscle loss, hormonal disruption, and immune weakness. Priority: caloric surplus with high protein intake to build lean mass before any other goal.',
    });
  } else {
    healthFlags.push({
      type: 'success',
      title: 'Healthy weight range',
      message: 'Your BMI is in the healthy range. Focus can shift to body composition — reducing body fat % and building muscle while maintaining total weight.',
    });
  }

  if (age >= 40) {
    healthFlags.push({
      type: 'info',
      title: `Age consideration (${age} yrs)`,
      message: `Metabolic rate slows ~2–5% per decade after 30. Recovery time is longer. Prioritise sleep quality, joint mobility work, and progressive overload over extreme volume.`,
    });
  }

  if (metabolicAge > age + 5) {
    healthFlags.push({
      type: 'warning',
      title: 'Metabolic age above calendar age',
      message: `Your estimated metabolic age (${metabolicAge}) is higher than your calendar age (${age}). This often indicates low muscle mass. Building lean muscle is the fastest way to boost your metabolic rate.`,
    });
  }

  if (stress === 'High') {
    healthFlags.push({
      type: 'warning',
      title: 'High stress detected',
      message: 'Elevated cortisol from chronic stress promotes fat storage (especially abdominal) and impairs muscle recovery. Stress management is a non-negotiable part of your transformation.',
    });
  }

  return {
    bmi, bmiCategory, bmiRisk, idealWeightMin, idealWeightMax, weightToLose,
    bmr, tdee, metabolicAge,
    fatLossCalories, aggressiveCutCalories, maintenanceCalories, leanGainCalories, bulkCalories,
    dailyProtein, healthFlags,
  };
}

export function getBMIBarPercent(bmi: number): number {
  if (bmi < 18.5) return Math.min((bmi / 18.5) * 25, 24);
  if (bmi < 25) return 25 + ((bmi - 18.5) / (25 - 18.5)) * 25;
  if (bmi < 30) return 50 + ((bmi - 25) / 5) * 25;
  return Math.min(75 + ((bmi - 30) / 10) * 25, 99);
}

export function getBMIColor(category: HealthMetrics['bmiCategory']): string {
  const colors = {
    'Underweight': '#3b82f6',
    'Normal': '#22c55e',
    'Overweight': '#f59e0b',
    'Obese': '#ef4444',
  };
  return colors[category];
}
