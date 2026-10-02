import { TRAINER_EMAILS } from '../constants';

export function resolveRole(email?: string | null): 'TRAINER' | 'CLIENT' {
  const normalized = (email || '').trim().toLowerCase();
  return TRAINER_EMAILS.some(value => value.toLowerCase() === normalized) ? 'TRAINER' : 'CLIENT';
}

const hasDetails = (value: unknown) =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

export function requiresOnboarding(profile: Record<string, any>): boolean {
  if (profile.role !== 'CLIENT' || profile.onboardingCompleted === true) return false;
  if (profile.onboardingCompleted === false) return true;
  // Legacy profiles may predate the flag; an empty/missing profile is not complete.
  return !hasDetails(profile.clientDetails) && !hasDetails(profile.healthAssessment);
}

export function buildClaimProfile(
  authUid: string,
  email: string,
  placeholder: Record<string, any> = {},
  existing: Record<string, any> = {},
  defaults: Record<string, any> = {},
): Record<string, any> {
  const merged: Record<string, any> = {
    ...defaults,
    ...placeholder,
    ...existing,
    // Auth identity must win over legacy IDs and caller-supplied fields.
    uid: authUid,
    id: authUid,
    email: email.trim().toLowerCase(),
    role: resolveRole(email),
  };
  delete merged.password;
  delete merged.assignedPassword;
  delete merged.passwordHash;
  merged.onboardingCompleted = !requiresOnboarding(merged);
  return merged;
}
