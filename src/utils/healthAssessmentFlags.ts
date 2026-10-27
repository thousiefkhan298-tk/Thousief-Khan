import { LeadContact, ParqAnswers, LeadDailyLife } from '../types';

export function computeHealthFlags(
  contact: Partial<LeadContact>,
  parq: Partial<ParqAnswers>,
  injuriesAndNotes: string = '',
  dailyLife?: Partial<LeadDailyLife>
): string[] {
  const flags: string[] = [];

  // 1. Critical PAR-Q Cardiovascular & Orthopedic checks
  if (parq.heartCondition) {
    flags.push('CRITICAL: Doctor-diagnosed heart condition (Physician clearance mandatory)');
  }
  if (parq.chestPainActive) {
    flags.push('CRITICAL: Chest pain during physical exertion (Immediate medical evaluation required)');
  }
  if (parq.chestPainRest) {
    flags.push('CRITICAL: Unprovoked chest pain at rest within past 30 days');
  }
  if (parq.dizzinessOrBalance) {
    flags.push('HIGH RISK: History of dizziness, fainting, or loss of balance');
  }
  if (parq.boneOrJointIssue) {
    flags.push('CAUTION: Bone, joint, or spinal condition aggravated by movement');
  }
  if (parq.bloodPressureOrHeartMeds) {
    flags.push('CARDIO: Currently prescribed blood pressure or cardiac medications');
  }
  if (parq.otherReasonNoExercise) {
    flags.push('RESTRICTION: Other physician-advised restrictions to physical activity');
  }

  // 2. Injuries & Medical Notes Review
  const notesLower = (injuriesAndNotes || '').toLowerCase().trim();
  if (notesLower.length > 0) {
    if (notesLower.includes('disc') || notesLower.includes('spine') || notesLower.includes('back')) {
      flags.push('ORTHOPEDIC: Spinal / lumbar injury history reported');
    }
    if (notesLower.includes('knee') || notesLower.includes('acl') || notesLower.includes('meniscus')) {
      flags.push('ORTHOPEDIC: Knee or ligament joint history reported');
    }
    if (notesLower.includes('surgery') || notesLower.includes('operation')) {
      flags.push('SURGICAL: Prior surgery documented — assess post-op clearance');
    }
    if (notesLower.includes('asthma') || notesLower.includes('respiratory') || notesLower.includes('breathing')) {
      flags.push('RESPIRATORY: Asthma or respiratory condition noted');
    }
    if (notesLower.includes('diabet') || notesLower.includes('sugar') || notesLower.includes('insulin')) {
      flags.push('METABOLIC: Diabetes / glycemic regulation condition noted');
    }
    if (notesLower.includes('bp') || notesLower.includes('hypertension') || notesLower.includes('pressure')) {
      if (!flags.some(f => f.includes('blood pressure'))) {
        flags.push('CARDIO: Hypertension or blood pressure history noted');
      }
    }
    // Generic flag if nothing specific matched but notes were provided
    if (flags.filter(f => f.startsWith('ORTHOPEDIC') || f.startsWith('SURGICAL') || f.startsWith('RESPIRATORY') || f.startsWith('METABOLIC')).length === 0) {
      flags.push(`MEDICAL NOTE: ${injuriesAndNotes.slice(0, 80)}${injuriesAndNotes.length > 80 ? '...' : ''}`);
    }
  }

  // 3. Daily Life & Lifestyle Stressors
  if (dailyLife) {
    if (dailyLife.stressLevel === 'Extreme' || dailyLife.stressLevel === 'High') {
      flags.push('LIFESTYLE: High/extreme lifestyle stress (cortisol & recovery risk)');
    }
    if (dailyLife.sleepHours && (dailyLife.sleepHours === '< 5h' || dailyLife.sleepHours === 'under 5' || parseFloat(dailyLife.sleepHours) < 5)) {
      flags.push('RECOVERY: Severe sleep deficit (< 5 hours/night)');
    }
    if (dailyLife.tobaccoUse === 'Regular') {
      flags.push('LIFESTYLE: Regular tobacco use (cardiovascular adaptation required)');
    }
    if (dailyLife.alcoholUse === 'Regular') {
      flags.push('LIFESTYLE: Regular alcohol intake (hydration & electrolyte monitoring)');
    }
    if (dailyLife.allergies && dailyLife.allergies.trim().length > 0) {
      flags.push(`ALLERGIES: ${dailyLife.allergies.trim().slice(0, 60)}`);
    }
  }

  // 4. Biometric BMI thresholds (if provided)
  const heightCm = typeof contact.height === 'number' ? contact.height : parseFloat(contact.height || '0');
  const weightKg = typeof contact.weight === 'number' ? contact.weight : parseFloat(contact.weight || '0');
  if (heightCm > 100 && weightKg > 30) {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    if (bmi >= 35) {
      flags.push(`BIOMETRIC: BMI ${bmi.toFixed(1)} (Requires low-impact joint loading protocols)`);
    } else if (bmi < 16.5) {
      flags.push(`BIOMETRIC: BMI ${bmi.toFixed(1)} (Severe underweight — nutritional clearance required)`);
    }
  }

  return flags;
}

export function formatWhatsAppPhone(phone: string): string {
  // Strips symbols and ensures clean numerical string for wa.me link
  const cleaned = phone.replace(/[^0-9]/g, '');
  // If Indian 10-digit number without country code, prepend 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}
