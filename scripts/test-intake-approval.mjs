import test from 'node:test';
import assert from 'node:assert/strict';

test('1. Unapproved workouts and drafts are strictly hidden from client view', () => {
  const allWorkoutPlans = [
    {
      id: 'plan-draft-1',
      title: 'Hypertrophy Phase 1',
      approved: false,
      approvalStatus: 'draft',
      isArchived: false,
      isDraft: true,
      sections: [{ title: 'Legs', content: 'Squats 4x10' }]
    },
    {
      id: 'plan-rev-2',
      title: 'Revision Routine',
      approved: false,
      approvalStatus: 'revision',
      isArchived: false,
      sections: [{ title: 'Arms', content: 'Curls 3x12' }]
    },
    {
      id: 'plan-approved-3',
      title: 'Trainer Approved EMS Plan',
      approved: true,
      approvalStatus: 'ready',
      isArchived: false,
      sections: [{ title: 'Chest & Back', content: 'EMS Pushups 3x15' }]
    },
    {
      id: 'plan-archived-unapproved',
      title: 'Old Draft',
      approved: false,
      isArchived: true,
      sections: [{ title: 'Old', content: 'Content' }]
    },
    {
      id: 'plan-archived-approved',
      title: 'Past Approved Plan',
      approved: true,
      approvalStatus: 'ready',
      isArchived: true,
      sections: [{ title: 'Core', content: 'Planks 3x60s' }]
    }
  ];

  // Exact filtering logic as implemented in ClientDashboard.tsx
  const verifiedApprovedWorkouts = allWorkoutPlans.filter(
    p => p.approved === true && p.approvalStatus !== 'draft' && p.approvalStatus !== 'revision' && !p.isDraft
  );

  const activeWorkoutPlan = verifiedApprovedWorkouts.find(p => !p.isArchived) || null;

  // Exact archive filtering logic as implemented in ClientMyPlanView.tsx
  const archivedWorkouts = allWorkoutPlans.filter(
    p => p.approved === true && p.isArchived && p.id !== activeWorkoutPlan?.id
  );

  assert.equal(verifiedApprovedWorkouts.length, 2, 'Only the 2 approved plans qualify');
  assert.equal(activeWorkoutPlan?.id, 'plan-approved-3', 'Active workout must be the approved ready plan');
  assert.equal(archivedWorkouts.length, 1, 'Only approved archived plan appears in client archive');
  assert.equal(archivedWorkouts[0].id, 'plan-archived-approved', 'Unapproved archived drafts must not appear');
});

test('2. Client without trainer-approved workout receives empty pending state', () => {
  const clientPlans = [
    {
      id: 'new-draft',
      title: 'AI Draft Generated',
      approved: false,
      approvalStatus: 'draft',
      isArchived: false
    }
  ];

  const verifiedApprovedWorkouts = clientPlans.filter(
    p => p.approved === true && p.approvalStatus !== 'draft' && p.approvalStatus !== 'revision' && !p.isDraft
  );

  const activeWorkoutPlan = verifiedApprovedWorkouts.find(p => !p.isArchived) || null;

  assert.equal(activeWorkoutPlan, null, 'Active workout plan must be null when trainer has not approved');
});

test('3. Client intake details filled at login are fully detected and computed for trainer dashboard', () => {
  const clientUser = {
    id: 'client-101',
    name: 'Rohan Sharma',
    email: 'rohan@example.com',
    onboardingCompleted: true,
    onboardingSubmittedAt: '2026-10-27T10:00:00.000Z',
    clientDetails: {
      fullName: 'Rohan Sharma',
      dob: '1995-06-15',
      gender: 'Male',
      phoneNumber: '+91 98765 43210',
      occupation: 'Software Architect',
      emergencyContactName: 'Priya Sharma',
      emergencyContactRelation: 'Spouse',
      emergencyContactPhone: '+91 98765 43211'
    },
    fitnessAssessment: {
      height: '178',
      weight: '82',
      trainingExperience: 'Intermediate (1-3 yrs)',
      currentActivityLevel: 'Moderately Active',
      equipmentAccess: ['Full Gym', 'EMS Suit'],
      preferredWorkoutTimes: ['Morning (6 AM - 9 AM)']
    },
    medicalAssessment: {
      conditions: ['Hypertension'],
      injuriesOrSurgeries: 'Right shoulder impingement (2024)',
      painOrRestrictions: ['Shoulder'],
      medications: 'Telmisartan 40mg',
      allergies: 'Peanuts',
      doctorRestrictions: 'Avoid overhead heavy pressing',
      flaggedForReview: true
    },
    dietPreferences: {
      dietType: 'Non-Vegetarian',
      dailyWaterIntake: '3-4 Litres',
      mealsPerDay: '4 Meals',
      supplementation: ['Whey Protein', 'Creatine']
    },
    termsConsent: {
      signatureName: 'Rohan Sharma',
      timestamp: '2026-10-27T10:00:00.000Z',
      acceptedTerms: true
    }
  };

  // BMI Calculation
  const heightM = Number(clientUser.fitnessAssessment.height) / 100;
  const bmi = Number((Number(clientUser.fitnessAssessment.weight) / (heightM * heightM)).toFixed(1));
  assert.equal(bmi, 25.9, 'BMI calculated correctly');

  // Medical Flag Verification
  const med = clientUser.medicalAssessment;
  const isMedicallyFlagged = Boolean(
    med.flaggedForReview || 
    (med.conditions && med.conditions.length > 0) || 
    med.injuriesOrSurgeries || 
    (med.painOrRestrictions && med.painOrRestrictions.some(p => p !== 'None')) || 
    med.doctorRestrictions
  );
  assert.equal(isMedicallyFlagged, true, 'Medical review required must be flagged for coach safety');
  assert.equal(med.conditions[0], 'Hypertension');
  assert.equal(clientUser.dietPreferences.dietType, 'Non-Vegetarian');
  assert.equal(clientUser.termsConsent.signatureName, 'Rohan Sharma');
});

test('4. Non-destructive client deduplication preserves intake details when merging with placeholder', () => {
  // Scenario: Trainer created a placeholder with temporary credentials and metadata
  const placeholderDoc = {
    id: 'placeholder_998877',
    name: 'Priya Verma',
    email: 'priya@example.com',
    assignedPassword: 'speedfit_temp_pass',
    trainerId: 'thousiefkhan298@gmail.com',
    status: 'Active',
    notes: 'Inquired from website form'
  };

  // Scenario: Client signs in with Google or Email auth, creating a 28-char Auth UID and submitting onboarding
  const realAuthClient = {
    uid: 'abCD1234567890efgh1234567890',
    id: 'abCD1234567890efgh1234567890',
    email: 'priya@example.com',
    name: 'Priya Verma',
    onboardingCompleted: true,
    clientDetails: {
      fullName: 'Priya Verma',
      dob: '1998-04-12',
      phoneNumber: '+91 91234 56789',
      occupation: 'Chartered Accountant',
      emergencyContact: 'Amit Verma (+91 91234 00000)'
    },
    fitnessAssessment: {
      height: '165',
      weight: '60',
      goals: ['Fat Loss', 'Posture Correction']
    },
    medicalAssessment: {
      conditions: [],
      noKnownConditions: true,
      injuriesOrSurgeries: 'None'
    },
    dietPreferences: {
      preference: 'Vegetarian',
      foodAllergies: ['None']
    },
    termsConsent: {
      accepted: true,
      typedFullName: 'Priya Verma'
    }
  };

  const rawList = [placeholderDoc, realAuthClient];

  // Exact non-destructive deduplication logic from useClients.ts & server.ts
  const emailMap = new Map();
  for (const u of rawList) {
    const emailKey = (u.email || '').trim().toLowerCase();
    const existing = emailMap.get(emailKey);
    if (!existing) {
      emailMap.set(emailKey, u);
    } else {
      const uId = u.id || u.uid || '';
      const exId = existing.id || existing.uid || '';
      const uIsRealAuth = uId.length > 20 && !u.assignedPassword && !u.password;
      const exIsRealAuth = exId.length > 20 && !existing.assignedPassword && !existing.password;

      const primary = uIsRealAuth ? u : (exIsRealAuth ? existing : (u.onboardingCompleted ? u : existing));
      const secondary = primary === u ? existing : u;

      const merged = {
        ...secondary,
        ...primary,
        id: primary.id || primary.uid,
        uid: primary.uid || primary.id,
        email: emailKey,
        clientDetails: primary.clientDetails || secondary.clientDetails,
        fitnessAssessment: primary.fitnessAssessment || secondary.fitnessAssessment,
        medicalAssessment: primary.medicalAssessment || secondary.medicalAssessment,
        dietPreferences: primary.dietPreferences || secondary.dietPreferences,
        termsConsent: primary.termsConsent || secondary.termsConsent,
        onboardingCompleted: Boolean(primary.onboardingCompleted || secondary.onboardingCompleted),
        name: primary.clientDetails?.fullName || primary.name || secondary.clientDetails?.fullName || secondary.name,
        phoneNumber: primary.clientDetails?.phoneNumber || primary.phoneNumber || secondary.clientDetails?.phoneNumber || secondary.phoneNumber,
        role: 'CLIENT'
      };
      emailMap.set(emailKey, merged);
    }
  }

  const clients = Array.from(emailMap.values());
  assert.equal(clients.length, 1, 'Only 1 consolidated client record must exist per email');
  assert.equal(clients[0].onboardingCompleted, true, 'Onboarding completion must be preserved');
  assert.equal(clients[0].clientDetails?.fullName, 'Priya Verma', 'Client details full name must be preserved');
  assert.equal(clients[0].clientDetails?.occupation, 'Chartered Accountant', 'Occupation must be preserved');
  assert.equal(clients[0].fitnessAssessment?.height, '165', 'Biometrics height must be preserved');
  assert.equal(clients[0].dietPreferences?.preference, 'Vegetarian', 'Diet preferences must be preserved');
  assert.equal(clients[0].notes, 'Inquired from website form', 'Trainer notes from placeholder must be preserved');
});

test('5. Trainer sync retains unassigned clients and admin-owned clients on dashboard', () => {
  const allGymClients = [
    { id: 'c1', name: 'Client 1', trainerId: 'Wr3ZaCCtFkM5IuAHUFsZznq973h2' },
    { id: 'c2', name: 'Client 2', trainerId: 'thousiefkhan298@gmail.com' },
    { id: 'c3', name: 'Client 3', trainerId: null }, // Unassigned recruit
    { id: 'c4', name: 'Client 4', trainerId: undefined } // Direct self-service signup
  ];

  const adminEmail = 'thousiefkhan298@gmail.com';
  const trainerId = 'Wr3ZaCCtFkM5IuAHUFsZznq973h2';
  const isOwnerOrAdmin = true;

  // Filter logic in useClients
  const visibleClients = allGymClients.filter(u => {
    if (isOwnerOrAdmin) return true;
    if (!u.trainerId) return true;
    return u.trainerId === trainerId || u.trainerId === adminEmail;
  });

  assert.equal(visibleClients.length, 4, 'Admin trainer must see all 4 clients including unassigned and email-tagged');
});

test('6. Trainer correctly filters for clients and strictly excludes trainer accounts from the roster', () => {
  const usersSnapshot = [
    { id: 'trainer-owner', name: 'Head Trainer Thousief', email: 'thousiefkhan298@gmail.com', role: 'TRAINER' },
    { id: 'trainer-secondary', name: 'Speed Fit Secondary', email: 'speedfit029@gmail.com', role: 'TRAINER' },
    { id: 'trainer-no-role', name: 'Trainer Without Role Flag', email: 'thousiefkhan298@gmail.com' }, // edge case: email match
    { id: 'client-active', name: 'Vikram Singh', email: 'vikram@example.com', role: 'CLIENT', status: 'Active' },
    { id: 'recruit-unassigned', name: 'Aarav Patel', email: 'aarav@example.com', role: undefined, status: 'Active' }
  ];

  const trainerEmails = ['thousiefkhan298@gmail.com', 'speedfit029@gmail.com'];

  // Exact client filtering logic implemented in useClients and TrainerDashboard
  const clientList = usersSnapshot.filter(u => {
    const isTrainerUser = u.role === 'TRAINER' || (u.email && trainerEmails.some(e => e.toLowerCase() === u.email.toLowerCase()));
    return !isTrainerUser && (u.role === 'CLIENT' || !u.role);
  });

  assert.equal(clientList.length, 2, 'Must contain exactly 2 clients');
  assert.equal(clientList[0].name, 'Vikram Singh', 'First client is Vikram Singh');
  assert.equal(clientList[1].name, 'Aarav Patel', 'Second client is Aarav Patel (recruit with unassigned role)');
  assert.ok(!clientList.some(c => c.email === 'thousiefkhan298@gmail.com'), 'Head trainer must never be in client list');
  assert.ok(!clientList.some(c => c.email === 'speedfit029@gmail.com'), 'Secondary trainer must never be in client list');
});


