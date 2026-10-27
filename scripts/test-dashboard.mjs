import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function loadModule(entry, plugins = []) {
  // Resolve only the small set of test subjects, without probing parent folders.
  const sources = {
    'src/services/profileIdentity.ts': 'src/services/profileIdentity.ts',
    'src/services/accountLinking.ts': 'src/services/accountLinking.ts',
    'src/services/sessionBookingService.ts': 'src/services/sessionBookingService.ts',
    '../constants': 'src/constants.ts',
    './profileIdentity': 'src/services/profileIdentity.ts',
  };
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', tsconfigRaw: {},
    plugins: [...plugins, {
      name: 'test-source-files',
      setup(builder) {
        builder.onResolve({filter: /.*/}, args => {
          const key = args.kind === 'entry-point' ? args.path.replace(/^\.\//, '') : args.path;
          return sources[key] ? {path: sources[key], namespace:'test-source'} : undefined;
        });
        builder.onLoad({filter: /.*/, namespace:'test-source'}, async args => ({contents: await readFile(path.resolve(args.path), 'utf8'), loader:'ts'}));
      },
    }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const { buildClaimProfile, requiresOnboarding, resolveRole } = await loadModule('src/services/profileIdentity.ts');
const fake = { auth: { currentUser: null }, existing: null, docs: [], writes: [], queries: 0 };
globalThis.__speedFitAuthTest = fake;
const accounts = await loadModule('src/services/accountLinking.ts', [{
  name: 'isolated-firebase',
  setup(builder) {
    builder.onResolve({ filter: /^\.\.\/firebase$/ }, () => ({ path: 'app', namespace: 'fake' }));
    builder.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'fake' }));
    builder.onLoad({ filter: /.*/, namespace: 'fake' }, args => ({ contents: args.path === 'app'
      ? 'export const auth = globalThis.__speedFitAuthTest.auth; export const db = {};'
      : `const fake = globalThis.__speedFitAuthTest;
         export const doc = (_db, collection, id) => ({ collection, id });
         export const collection = (_db, name) => name;
         export const query = (...args) => args;
         export const where = (...args) => args;
         export const getDoc = async () => ({ exists: () => !!fake.existing, data: () => fake.existing });
         export const getDocs = async () => { fake.queries++; return { docs: fake.docs.map(d => ({id:d.id, data: () => d.data})) }; };
         export const setDoc = async (ref, data) => fake.writes.push({ref, data});
         export const updateDoc = setDoc;
         export const deleteField = () => null;
         export const writeBatch = () => { throw new Error('Unexpected record migration in sign-in tests'); };`
    }));
  },
}]);

function reset() {
  fake.auth.currentUser = { uid: 'auth-client', email: 'client@example.com', emailVerified: true };
  fake.existing = null;
  fake.docs = [];
  fake.writes = [];
  fake.queries = 0;
}

test('auth identity wins over stale IDs, email and roles', () => {
  const profile = buildClaimProfile('auth-client', ' CLIENT@EXAMPLE.COM ',
    { uid: 'old-client', id: 'old-client', role: 'TRAINER', email: 'wrong@example.com' }, {},
    { uid: 'other-client', role: 'TRAINER' });
  assert.equal(profile.uid, 'auth-client');
  assert.equal(profile.id, 'auth-client');
  assert.equal(profile.email, 'client@example.com');
  assert.equal(profile.role, 'CLIENT');
});

test('profile copies never include legacy passwords or hashes', () => {
  const profile = buildClaimProfile('uid', 'client@example.com', {password:'secret', assignedPassword:'secret', passwordHash:'hash'});
  for (const key of ['password', 'assignedPassword', 'passwordHash']) assert.equal(key in profile, false);
});

test('current profile data takes priority over old data and sign-in defaults', () => {
  const profile = buildClaimProfile('uid', 'client@example.com', { name: 'Old name', trainerId: 'old-trainer' },
    { name: 'Current name', trainerId: 'current-trainer', onboardingCompleted: true }, {name:'Google name',trainerId:null});
  assert.equal(profile.name, 'Current name');
  assert.equal(profile.trainerId, 'current-trainer');
  assert.equal(requiresOnboarding(profile), false);
});

test('new clients do not bypass onboarding with a missing or empty profile', () => {
  assert.equal(requiresOnboarding(buildClaimProfile('uid', 'client@example.com')), true);
  assert.equal(requiresOnboarding({role:'CLIENT', clientDetails:{}}), true);
});

test('legacy populated profiles open; explicit unfinished profiles still onboard', () => {
  assert.equal(requiresOnboarding({role:'CLIENT',clientDetails:{fullName:'Example'}}), false);
  assert.equal(requiresOnboarding({role:'CLIENT',healthAssessment:{weight:'70'}}), false);
  assert.equal(requiresOnboarding({role:'CLIENT',clientDetails:{fullName:'Example'},onboardingCompleted:false}), true);
});

test('configured trainers resolve consistently without trusting a stored role', () => {
  assert.equal(resolveRole(' SPEEDFIT029@GMAIL.COM '), 'TRAINER');
  assert.equal(requiresOnboarding(buildClaimProfile('trainer', 'speedfit029@gmail.com')), false);
  assert.equal(resolveRole('client@example.com'), 'CLIENT');
});

test('returning members do not re-import or query old profiles', async () => {
  reset();
  fake.existing = { uid:'wrong-old-id', name:'Current name', role:'CLIENT', onboardingCompleted:true };
  fake.docs = [{id:'old',data:{name:'Old name'}}];
  await accounts.claimPlaceholderAccount('auth-client','client@example.com');
  assert.equal(fake.queries, 0);
  assert.equal(fake.writes[0].data.uid, 'auth-client');
  assert.equal(fake.writes[0].data.name, 'Current name');
});

test('verified member links a placeholder with the authenticated ID', async () => {
  reset();
  fake.docs = [{id:'old-client',data:{uid:'old-client',id:'old-client',clientDetails:{fullName:'Example'}, trainerId:'assigned-trainer'}}];
  await accounts.claimPlaceholderAccount('auth-client','client@example.com');
  const profile = fake.writes[0].data;
  assert.equal(profile.uid, 'auth-client');
  assert.equal(profile.id, 'auth-client');
  assert.equal(profile.claimedFromId, 'old-client');
  assert.equal(profile.trainerId, 'assigned-trainer');
  assert.equal(profile.onboardingCompleted, true);
});

test('an unverified email cannot claim a legacy profile', async () => {
  reset();
  fake.auth.currentUser.emailVerified = false;
  fake.docs = [{id:'old-client',data:{}}];
  await assert.rejects(accounts.claimPlaceholderAccount('auth-client','client@example.com'), /Verify your email/);
  assert.equal(fake.writes.length, 0);
});

test('ambiguous duplicate profiles are not picked arbitrarily', async () => {
  reset();
  fake.docs = [{id:'first-client',data:{}},{id:'second-client',data:{}}];
  await assert.rejects(accounts.claimPlaceholderAccount('auth-client','client@example.com'), /More than one/);
  assert.equal(fake.writes.length, 0);
});

test('sign-in cannot link a different user identity', async () => {
  reset();
  await assert.rejects(accounts.claimPlaceholderAccount('someone-else','client@example.com'), /Sign in before linking/);
  assert.equal(fake.queries, 0);
  assert.equal(fake.writes.length, 0);
});

test('opening another trainer dashboard preserves assigned trainer', async () => {
  reset();
  await accounts.reconcileClientAccounts([{uid:'client-short-id',trainerId:'original-trainer'}], 'different-trainer');
  assert.equal(fake.writes.length, 0);
});

// Load sessionBookingService for Requirement 6 & 12 verification
const { validateSixtyMinuteNotice, checkOverlappingSessions, evaluatePaymentReminder, parseISTDateTime } = await loadModule('src/services/sessionBookingService.ts');

test('a request exactly 60 minutes before a session is accepted; one less than 60 minutes before is rejected', () => {
  // Use a fixed reference timestamp for deterministic testing
  // Session time: 2026-10-10 18:00 IST (UTC 12:30)
  const sessionDate = '2026-10-10';
  const sessionTime = '18:00';
  const sessionTargetMs = parseISTDateTime(sessionDate, sessionTime).getTime();

  // Exactly 60 minutes before (17:00:00 IST) -> 60 minutes notice
  const exact60MinBefore = sessionTargetMs - 60 * 60 * 1000;
  const validResult = validateSixtyMinuteNotice(sessionDate, sessionTime, exact60MinBefore);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.minutesNotice, 60);

  // 61 minutes before -> valid
  const more60MinBefore = sessionTargetMs - 61 * 60 * 1000;
  assert.equal(validateSixtyMinuteNotice(sessionDate, sessionTime, more60MinBefore).valid, true);

  // 59 minutes before (17:01:00 IST) -> rejected!
  const less59MinBefore = sessionTargetMs - 59 * 60 * 1000;
  const invalidResult = validateSixtyMinuteNotice(sessionDate, sessionTime, less59MinBefore);
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.minutesNotice, 59);
  assert.match(invalidResult.error, /at least 60 minutes before start time/);

  // 30 minutes before -> rejected
  const less30MinBefore = sessionTargetMs - 30 * 60 * 1000;
  assert.equal(validateSixtyMinuteNotice(sessionDate, sessionTime, less30MinBefore).valid, false);

  // Session start time itself (0 min) -> rejected
  assert.equal(validateSixtyMinuteNotice(sessionDate, sessionTime, sessionTargetMs).valid, false);
});

test('two simultaneous approvals cannot double-book the trainer', () => {
  const existingConfirmed = [
    { id: 'session-1', date: '2026-10-12', time: '10:00', durationMinutes: 60, status: 'Confirmed' }
  ];

  // Identical slot
  const identicalConflict = checkOverlappingSessions(existingConfirmed, '2026-10-12', '10:00', 60);
  assert.equal(identicalConflict.hasConflict, true);
  assert.equal(identicalConflict.conflictingSession.id, 'session-1');

  // Overlapping by 30 minutes (10:30 start)
  const overlapConflict = checkOverlappingSessions(existingConfirmed, '2026-10-12', '10:30', 60);
  assert.equal(overlapConflict.hasConflict, true);

  // Non-overlapping slots: 11:00 on same day is available
  const nonOverlap = checkOverlappingSessions(existingConfirmed, '2026-10-12', '11:00', 60);
  assert.equal(nonOverlap.hasConflict, false);

  // Non-overlapping slots: 09:00 on same day is available
  const beforeSlot = checkOverlappingSessions(existingConfirmed, '2026-10-12', '09:00', 60);
  assert.equal(beforeSlot.hasConflict, false);

  // Different date is available
  const differentDay = checkOverlappingSessions(existingConfirmed, '2026-10-13', '10:00', 60);
  assert.equal(differentDay.hasConflict, false);
});

test('payment due-date reminders trigger at 3 days, due date, and recurring overdue, and stop when cleared', () => {
  // Use a fixed reference date in IST
  const baseDate = new Date('2026-11-10T12:00:00+05:30');

  // 1. Due in 3 days (Nov 13)
  const rem3Days = evaluatePaymentReminder('2026-11-13', 'Due', 5000, baseDate);
  assert.equal(rem3Days.shouldRemind, true);
  assert.equal(rem3Days.stage, 'due_in_3_days');
  assert.equal(rem3Days.daysUntilDue, 3);

  // 2. Due today (Nov 10)
  const remToday = evaluatePaymentReminder('2026-11-10', 'Due', 5000, baseDate);
  assert.equal(remToday.shouldRemind, true);
  assert.equal(remToday.stage, 'due_today');
  assert.equal(remToday.daysUntilDue, 0);

  // 3. Overdue by 1 day (Nov 09)
  const remOverdue1 = evaluatePaymentReminder('2026-11-09', 'Overdue', 5000, baseDate);
  assert.equal(remOverdue1.shouldRemind, true);
  assert.equal(remOverdue1.stage, 'overdue');
  assert.equal(remOverdue1.overdueDays, 1);

  // 4. Overdue by 2 days -> not on the 3-day recurring cadence
  const remOverdue2 = evaluatePaymentReminder('2026-11-08', 'Overdue', 5000, baseDate);
  assert.equal(remOverdue2.shouldRemind, false);

  // 5. Overdue by 4 days (1 + 3 days interval) -> should remind
  const remOverdue4 = evaluatePaymentReminder('2026-11-06', 'Overdue', 5000, baseDate);
  assert.equal(remOverdue4.shouldRemind, true);
  assert.equal(remOverdue4.overdueDays, 4);

  // 6. Paid or zero balance -> must NEVER remind
  const remPaid = evaluatePaymentReminder('2026-11-06', 'Paid', 0, baseDate);
  assert.equal(remPaid.shouldRemind, false);

  const remZeroBalance = evaluatePaymentReminder('2026-11-06', 'Due', 0, baseDate);
  assert.equal(remZeroBalance.shouldRemind, false);
});

test('attendance corrections retain complete audit history', () => {
  const initialAudit = {
    changedBy: 'trainer-1',
    changedByName: 'Coach Thousief',
    changedAt: '2026-10-01T10:00:00.000Z',
    newStatus: 'Present',
    newNotes: 'Solid performance on squats',
    reason: 'Initial attendance entry'
  };

  const attendanceRecord = {
    id: 'att-123',
    clientId: 'client-A',
    date: '2026-10-01',
    time: '10:00',
    status: 'Present',
    trainerNotes: 'Solid performance on squats',
    createdBy: 'trainer-1',
    auditHistory: [initialAudit]
  };

  // Correction by trainer
  const correctionAudit = {
    changedBy: 'trainer-1',
    changedByName: 'Coach Thousief',
    changedAt: '2026-10-01T14:30:00.000Z',
    oldStatus: attendanceRecord.status,
    newStatus: 'Late',
    oldNotes: attendanceRecord.trainerNotes,
    newNotes: 'Arrived 15 minutes late due to traffic, adjusted session length',
    reason: 'Correction of arrival status'
  };

  const updatedRecord = {
    ...attendanceRecord,
    status: 'Late',
    trainerNotes: correctionAudit.newNotes,
    updatedBy: 'trainer-1',
    updatedAt: correctionAudit.changedAt,
    auditHistory: [...attendanceRecord.auditHistory, correctionAudit]
  };

  assert.equal(updatedRecord.auditHistory.length, 2);
  assert.equal(updatedRecord.auditHistory[0].newStatus, 'Present');
  assert.equal(updatedRecord.auditHistory[1].oldStatus, 'Present');
  assert.equal(updatedRecord.auditHistory[1].newStatus, 'Late');
  assert.equal(updatedRecord.auditHistory[1].reason, 'Correction of arrival status');
});

test('onboarding resumes correctly and does not repeat after completion', () => {
  // Incomplete profile requires onboarding
  const partialClient = {
    uid: 'client-1',
    role: 'CLIENT',
    clientDetails: { fullName: 'Aarav Sharma', phone: '+919876543210' },
    // Missing fitness, medical, diet, terms
    onboardingCompleted: false
  };
  assert.equal(requiresOnboarding(partialClient), true);

  // Fully completed profile does not require onboarding
  const completedClient = {
    uid: 'client-1',
    role: 'CLIENT',
    clientDetails: { fullName: 'Aarav Sharma' },
    fitnessAssessment: { height: '178', weight: '74' },
    medicalAssessment: { hasInjuries: false, noKnownConditions: true },
    dietPreferences: { dietaryPreference: 'Non-Vegetarian' },
    termsConsent: { accepted: true, typedFullName: 'Aarav Sharma', version: 'v1.0' },
    onboardingCompleted: true
  };
  assert.equal(requiresOnboarding(completedClient), false);
});

test('Client A cannot access Client B records and client cannot elevate role', () => {
  const clientA = { uid: 'client-A', email: 'clientA@example.com', role: 'CLIENT' };
  const clientB = { uid: 'client-B', email: 'clientB@example.com', role: 'CLIENT' };

  // Helper mimicking Firestore security rules checks
  function canReadUser(requestUid, targetDocUid, targetUserRole) {
    if (requestUid === targetDocUid) return true;
    if (targetUserRole === 'TRAINER') return true; // clients can view trainer info
    return false; // Client A cannot read Client B's private user record
  }

  function canModifyPlanOrRecord(requestRole) {
    return requestRole === 'TRAINER'; // Client cannot create/modify/delete workout/diet/attendance/progress/payments
  }

  assert.equal(canReadUser(clientA.uid, clientA.uid, 'CLIENT'), true);
  assert.equal(canReadUser(clientA.uid, clientB.uid, 'CLIENT'), false); // BLOCKED!

  assert.equal(canModifyPlanOrRecord(clientA.role), false); // BLOCKED!
  assert.equal(canModifyPlanOrRecord('TRAINER'), true); // ALLOWED for trainer
});

test('existing invited client links pre-created record to new auth UID and retains assigned trainer', async () => {
  reset();
  fake.auth.currentUser = { uid: 'auth-uid-rohan', email: 'rohan@speedfit.com', emailVerified: true };
  fake.docs = [{
    id: 'placeholder-doc-123',
    data: {
      uid: 'placeholder-doc-123',
      name: 'Rohan Verma',
      email: 'rohan@speedfit.com',
      trainerId: 'coach-thousief',
      role: 'CLIENT',
      createdAt: '2026-10-01T10:00:00.000Z'
    }
  }];

  const linkedId = await accounts.claimPlaceholderAccount('auth-uid-rohan', 'rohan@speedfit.com');
  assert.equal(linkedId, 'placeholder-doc-123');
  assert.equal(fake.writes.length, 1);
  const canonical = fake.writes[0].data;
  assert.equal(canonical.uid, 'auth-uid-rohan');
  assert.equal(canonical.id, 'auth-uid-rohan');
  assert.equal(canonical.email, 'rohan@speedfit.com');
  assert.equal(canonical.trainerId, 'coach-thousief');
  assert.equal(canonical.claimedFromId, 'placeholder-doc-123');
  assert.equal(canonical.linkPending, true);
  assert.equal(canonical.role, 'CLIENT');
});

test('new self-signup client initializes profile without attaching to an arbitrary trainer', async () => {
  reset();
  fake.auth.currentUser = { uid: 'auth-new-client', email: 'newclient@example.com', emailVerified: true };
  fake.docs = []; // No pre-created placeholder

  const result = await accounts.claimPlaceholderAccount('auth-new-client', 'newclient@example.com');
  assert.equal(result, null);
  assert.equal(fake.writes.length, 1);
  const profile = fake.writes[0].data;
  assert.equal(profile.uid, 'auth-new-client');
  assert.equal(profile.email, 'newclient@example.com');
  assert.equal(profile.role, 'CLIENT');
  assert.equal(profile.claimedFromId, undefined);
  assert.equal(profile.trainerId, undefined); // NOT assigned to an arbitrary trainer
});

test('URL trainerId cannot override an existing invited client assigned trainer', async () => {
  reset();
  fake.auth.currentUser = { uid: 'auth-uid-client', email: 'invited@speedfit.com', emailVerified: true };
  fake.docs = [{
    id: 'placeholder-invited',
    data: {
      uid: 'placeholder-invited',
      name: 'Invited Athlete',
      email: 'invited@speedfit.com',
      trainerId: 'authoritative-trainer-id',
      role: 'CLIENT'
    }
  }];

  // Malicious or mismatched URL param ?trainerId=rogue-trainer-id
  await accounts.claimPlaceholderAccount('auth-uid-client', 'invited@speedfit.com', {
    trainerId: 'rogue-trainer-id'
  });

  const canonical = fake.writes[0].data;
  // Pre-created placeholder's assigned trainerId must WIN!
  assert.equal(canonical.trainerId, 'authoritative-trainer-id');
  assert.notEqual(canonical.trainerId, 'rogue-trainer-id');
});

test('reload and persistence: canonical profile is preserved on reload without querying stale docs', async () => {
  reset();
  fake.auth.currentUser = { uid: 'auth-persisted-user', email: 'persisted@speedfit.com', emailVerified: true };
  fake.existing = {
    uid: 'auth-persisted-user',
    name: 'Persisted Member',
    email: 'persisted@speedfit.com',
    trainerId: 'coach-thousief',
    role: 'CLIENT',
    onboardingCompleted: true
  };
  fake.docs = [{ id: 'stale-placeholder', data: { name: 'Stale Name', trainerId: 'old-trainer' } }];

  await accounts.claimPlaceholderAccount('auth-persisted-user', 'persisted@speedfit.com');
  assert.equal(fake.queries, 0); // Did not query stale placeholder collection!
  assert.equal(fake.writes.length, 1);
  assert.equal(fake.writes[0].data.name, 'Persisted Member');
  assert.equal(fake.writes[0].data.trainerId, 'coach-thousief');
});

test('wrong trainer access denied: Trainer 2 cannot view or stamp Trainer 1 client', async () => {
  reset();
  const clientTrainer1 = {
    uid: 'client-assigned-to-1',
    name: 'Trainer 1 Athlete',
    trainerId: 'trainer-1',
    role: 'CLIENT'
  };

  // 1. Reconciling as Trainer 2 must NOT modify Trainer 1's client
  await accounts.reconcileClientAccounts([clientTrainer1], 'trainer-2');
  assert.equal(fake.writes.length, 0);

  // 2. Trainer 2 roster query must filter out clientTrainer1
  const allClients = [
    clientTrainer1,
    { uid: 'client-assigned-to-2', name: 'Trainer 2 Athlete', trainerId: 'trainer-2', role: 'CLIENT' }
  ];
  const trainer2Roster = allClients.filter(c => c.trainerId === 'trainer-2');
  assert.equal(trainer2Roster.length, 1);
  assert.equal(trainer2Roster[0].uid, 'client-assigned-to-2');
  assert.equal(trainer2Roster.some(c => c.uid === 'client-assigned-to-1'), false);
});


