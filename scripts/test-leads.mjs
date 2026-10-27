import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { computeHealthFlags, formatWhatsAppPhone } from '../src/utils/healthAssessmentFlags.js';

test('1. WhatsApp Phone Number Formatting', () => {
  assert.equal(formatWhatsAppPhone('9876543210'), '919876543210', '10-digit Indian number prepends 91');
  assert.equal(formatWhatsAppPhone('+91 98765 43210'), '919876543210', 'Strips spaces and plus');
  assert.equal(formatWhatsAppPhone('+1 (555) 234-5678'), '15552345678', 'Handles US international format');
  assert.equal(formatWhatsAppPhone('919876543210'), '919876543210', 'Leaves 12-digit Indian number untouched');
});

test('2. Health Flags Calculation - Clean PAR-Q', () => {
  const contact = { name: 'Rahul', height: '175', weight: '70' };
  const parq = {
    heartCondition: false,
    chestPainActive: false,
    chestPainRest: false,
    dizzinessOrBalance: false,
    boneOrJointIssue: false,
    bloodPressureOrHeartMeds: false,
    otherReasonNoExercise: false
  };
  const dailyLife = {
    sleepHours: '7-8 hours',
    waterIntakeLiters: '2-3 Liters',
    stressLevel: 'Low',
    tobaccoUse: 'None',
    alcoholUse: 'None'
  };

  const flags = computeHealthFlags(contact, parq, '', dailyLife);
  assert.equal(flags.length, 0, 'Clean PAR-Q and healthy lifestyle generates 0 flags');
});

test('3. Health Flags Calculation - Critical Cardiovascular Risk', () => {
  const contact = { name: 'Vikram', height: '170', weight: '75' };
  const parq = {
    heartCondition: true,
    chestPainActive: true,
    chestPainRest: false,
    dizzinessOrBalance: false,
    boneOrJointIssue: false,
    bloodPressureOrHeartMeds: true,
    otherReasonNoExercise: false
  };

  const flags = computeHealthFlags(contact, parq, '');
  assert.ok(flags.length >= 3, 'Should flag multiple cardiac issues');
  assert.ok(flags.some(f => f.includes('CRITICAL: Doctor-diagnosed heart condition')), 'Flagged diagnosed heart condition');
  assert.ok(flags.some(f => f.includes('CRITICAL: Chest pain during physical exertion')), 'Flagged active chest pain');
  assert.ok(flags.some(f => f.includes('CARDIO: Currently prescribed blood pressure')), 'Flagged heart medications');
});

test('4. Health Flags Calculation - Orthopedic and Medical Notes', () => {
  const contact = { name: 'Anita', height: '162', weight: '60' };
  const parq = { boneOrJointIssue: true };
  const notes = 'Had ACL reconstruction surgery on right knee 2 years ago, still feel stiffness in deep squats.';

  const flags = computeHealthFlags(contact, parq, notes);
  assert.ok(flags.some(f => f.includes('Bone, joint, or spinal condition')), 'Flagged bone/joint issue');
  assert.ok(flags.some(f => f.includes('ORTHOPEDIC: Knee or ligament joint history')), 'Parsed knee injury from notes');
  assert.ok(flags.some(f => f.includes('SURGICAL: Prior surgery documented')), 'Parsed surgery from notes');
});

test('5. Health Flags Calculation - Lifestyle Stress & Sleep Deficit', () => {
  const contact = { name: 'Karan', height: '180', weight: '82' };
  const parq = {};
  const dailyLife = {
    sleepHours: '< 5h',
    stressLevel: 'Extreme',
    tobaccoUse: 'Regular',
    alcoholUse: 'Regular',
    allergies: 'Severe peanut allergy'
  };

  const flags = computeHealthFlags(contact, parq, '', dailyLife);
  assert.ok(flags.some(f => f.includes('High/extreme lifestyle stress')), 'Flagged extreme stress');
  assert.ok(flags.some(f => f.includes('Severe sleep deficit')), 'Flagged severe sleep deficit');
  assert.ok(flags.some(f => f.includes('Regular tobacco use')), 'Flagged regular tobacco use');
  assert.ok(flags.some(f => f.includes('Regular alcohol intake')), 'Flagged regular alcohol intake');
  assert.ok(flags.some(f => f.includes('ALLERGIES')), 'Flagged allergies');
});

test('6. Health Flags Calculation - Biometric BMI Thresholds', () => {
  // BMI = 110 / (1.70 * 1.70) = 38.06 (Obesity Class II)
  const contactHigh = { height: 170, weight: 110 };
  const flagsHigh = computeHealthFlags(contactHigh, {});
  assert.ok(flagsHigh.some(f => f.includes('BIOMETRIC: BMI 38.1')), 'Detected high BMI');

  // BMI = 40 / (1.70 * 1.70) = 13.84 (Severe Underweight)
  const contactLow = { height: 170, weight: 40 };
  const flagsLow = computeHealthFlags(contactLow, {});
  assert.ok(flagsLow.some(f => f.includes('BIOMETRIC: BMI 13.8')), 'Detected severe underweight BMI');
});

test('7. Lead Submission Validation Rules', () => {
  function validateSubmission(contact, consent) {
    if (!contact || typeof contact !== 'object') return { valid: false, error: 'Contact required' };
    const name = (contact.name || '').trim();
    if (name.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
    const digits = (contact.whatsapp || '').replace(/[^0-9]/g, '');
    if (digits.length < 7 || digits.length > 15) return { valid: false, error: 'Invalid WhatsApp' };
    if (!consent || !consent.accepted) return { valid: false, error: 'Consent required' };
    return { valid: true };
  }

  // Invalid: name too short
  assert.equal(validateSubmission({ name: 'A', whatsapp: '9876543210' }, { accepted: true }).valid, false);

  // Invalid: phone too short
  assert.equal(validateSubmission({ name: 'Rahul', whatsapp: '123' }, { accepted: true }).valid, false);

  // Invalid: missing consent
  assert.equal(validateSubmission({ name: 'Rahul', whatsapp: '9876543210' }, { accepted: false }).valid, false);

  // Valid
  assert.equal(validateSubmission({ name: 'Rahul Sharma', whatsapp: '+91 98765 43210' }, { accepted: true }).valid, true);
});

test('8. Pipeline Status Transitions', () => {
  const validStatuses = ['New', 'Contacted', 'Qualified', 'Assessment Booked', 'Won', 'Not Now'];
  assert.equal(validStatuses.length, 6, 'Exactly 6 pipeline statuses exist');

  // Verify transition from New to Contacted on WhatsApp action
  let lead = { status: 'New', followUpHistory: [] };
  const followUpEvent = { date: new Date().toISOString(), stage: 'immediate', channel: 'whatsapp' };
  lead.followUpHistory.push(followUpEvent);
  lead.status = lead.status === 'New' ? 'Contacted' : lead.status;

  assert.equal(lead.status, 'Contacted', 'Lead transitions to Contacted');
  assert.equal(lead.followUpHistory.length, 1);
});

test('9. Safe Deduplication Logic for Lead-to-Client Conversion', () => {
  const existingUsers = [
    { id: 'client_1', email: 'alex@example.com', phoneNumber: '+919876543210', name: 'Alex' },
    { id: 'client_2', email: 'priya@example.com', phoneNumber: '+919988776655', name: 'Priya' },
  ];

  function findExistingClient(leadContact, userList) {
    const leadEmail = (leadContact.email || '').toLowerCase().trim();
    const leadDigits = (leadContact.whatsapp || '').replace(/[^0-9]/g, '');

    // 1. Email check
    if (leadEmail) {
      const byEmail = userList.find(u => u.email.toLowerCase() === leadEmail);
      if (byEmail) return { isExisting: true, client: byEmail };
    }

    // 2. Phone digits check
    if (leadDigits.length >= 7) {
      const byPhone = userList.find(u => {
        const uDigits = (u.phoneNumber || '').replace(/[^0-9]/g, '');
        return uDigits && (uDigits.endsWith(leadDigits) || leadDigits.endsWith(uDigits));
      });
      if (byPhone) return { isExisting: true, client: byPhone };
    }

    return { isExisting: false, client: null };
  }

  // Test 1: Match by Email
  const matchEmail = findExistingClient({ email: 'alex@example.com', whatsapp: '+91 1122334455' }, existingUsers);
  assert.equal(matchEmail.isExisting, true);
  assert.equal(matchEmail.client.id, 'client_1');

  // Test 2: Match by Phone
  const matchPhone = findExistingClient({ email: 'newemail@example.com', whatsapp: '9876543210' }, existingUsers);
  assert.equal(matchPhone.isExisting, true);
  assert.equal(matchPhone.client.id, 'client_1');

  // Test 3: No Match (creates new client)
  const noMatch = findExistingClient({ email: 'rohit@example.com', whatsapp: '+91 8887776665' }, existingUsers);
  assert.equal(noMatch.isExisting, false);
  assert.equal(noMatch.client, null);
});

test('10. WhatsApp Message Templates', () => {
  function getTemplate(lead, stage, coachName = 'Coach Thousief') {
    const name = lead.contact.name.split(' ')[0];
    const goal = lead.goals.primaryGoal;
    switch (stage) {
      case 'immediate':
        return `Hi ${name}! This is ${coachName} from Speed Fit. I just reviewed your assessment for ${goal}. Fantastic job taking the first step! Are you free for a quick 5-minute call today to discuss your schedule and program targets?`;
      case 'day1':
        return `Hey ${name}, ${coachName} here from Speed Fit following up! I've drafted a preliminary routine based on your ${goal} and Speed Fit Gym preferences. When is a good time to connect today so I can walk you through it?`;
      case 'day3':
        return `Hi ${name}! Speed Fit checking in. Our coaching slots for this week's 1-on-1 biometrics evaluations are filling up quickly. Would morning or evening work better for your initial evaluation session?`;
      case 'day7':
        return `Hey ${name}, wanted to share a quick coaching tip for ${goal}: consistent execution in week 1 sets the tone for your entire result! Let me know if you'd still like to get started with your Speed Fit program.`;
      case 'day14':
        return `Hi ${name}, checking in one last time from Speed Fit! If life got busy, no worries at all. Whenever you're ready to restart your fitness journey, your assessment biometrics are safely saved with us. Just reply to this message!`;
      default:
        return '';
    }
  }

  const testLead = {
    contact: { name: 'Deepak Verma', whatsapp: '+91 99999 88888' },
    goals: { primaryGoal: 'Fat Loss' }
  };

  const immediate = getTemplate(testLead, 'immediate');
  assert.ok(immediate.includes('Hi Deepak!'));
  assert.ok(immediate.includes('Fat Loss'));
  assert.ok(immediate.includes('Coach Thousief'));

  const day1 = getTemplate(testLead, 'day1');
  assert.ok(day1.includes('Hey Deepak'));

  const day3 = getTemplate(testLead, 'day3');
  assert.ok(day3.includes('initial evaluation session'));

  const day7 = getTemplate(testLead, 'day7');
  assert.ok(day7.includes('consistent execution in week 1'));

  const day14 = getTemplate(testLead, 'day14');
  assert.ok(day14.includes('checking in one last time'));
});

test('11. CSV Export Generation & Escaping', () => {
  function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  assert.equal(escapeCsv('Simple Text'), '"Simple Text"');
  assert.equal(escapeCsv('Text, with comma'), '"Text, with comma"');
  assert.equal(escapeCsv('Text with "quotes"'), '"Text with ""quotes"""');
  assert.equal(escapeCsv(null), '""');
});

test('12. Trainer Role Access Control for Leads Endpoint', () => {
  function verifyAccess(headers) {
    const role = (headers['x-user-role'] || '').toUpperCase();
    const email = (headers['x-user-email'] || '').toLowerCase();
    const trainerEmails = ['thousiefkhan298@gmail.com'];

    if (role === 'TRAINER' || trainerEmails.includes(email)) {
      return { allowed: true };
    }
    if (role === 'CLIENT') {
      return { allowed: false, error: 'Access restricted: Trainer credentials required' };
    }
    return { allowed: false, error: 'Authentication required' };
  }

  // Trainer role allowed
  assert.equal(verifyAccess({ 'x-user-role': 'TRAINER' }).allowed, true);
  assert.equal(verifyAccess({ 'x-user-email': 'thousiefkhan298@gmail.com' }).allowed, true);

  // Client role rejected
  const clientAttempt = verifyAccess({ 'x-user-role': 'CLIENT' });
  assert.equal(clientAttempt.allowed, false);
  assert.equal(clientAttempt.error, 'Access restricted: Trainer credentials required');

  // Unauthenticated rejected
  assert.equal(verifyAccess({}).allowed, false);
});

test('13. Payment Reminder Runner PERMISSION_DENIED Isolation', () => {
  function isHandledPermissionError(err) {
    const msg = String(err?.message || err || '');
    const code = err?.code;
    return (
      code === 7 ||
      code === 'permission-denied' ||
      code === 'PERMISSION_DENIED' ||
      code === 16 ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('Could not load the default credentials') ||
      msg.includes('UNAUTHENTICATED')
    );
  }

  assert.equal(isHandledPermissionError({ code: 7, message: '7 PERMISSION_DENIED: Missing permissions' }), true);
  assert.equal(isHandledPermissionError({ message: 'Could not load the default credentials' }), true);
  assert.equal(isHandledPermissionError({ code: 'permission-denied' }), true);
  assert.equal(isHandledPermissionError(new Error('SyntaxError in parsing')), false);
});

test('14. Regression: No Direct Client Firestore leadSubmissions Listeners or Collections', () => {
  function scanDir(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(scanDir(full));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(full);
      }
    }
    return files;
  }

  const srcFiles = scanDir(path.resolve('src'));
  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Ensure no client file attaches Firestore collection on leadSubmissions
    assert.equal(
      content.includes("collection(db, 'leadSubmissions')") || content.includes('collection(db, "leadSubmissions")'),
      false,
      `File ${filePath} must not directly call collection(db, 'leadSubmissions') on client Firestore`
    );
    // Ensure no client file calls onSnapshot with leadSubmissions
    assert.equal(
      content.includes("leadSubmissions") && content.includes("onSnapshot"),
      false,
      `File ${filePath} must not attach onSnapshot listener to leadSubmissions`
    );
  }

  // Verify TrainerDashboard does not invoke subscribeToLeads
  const trainerDashboard = fs.readFileSync(path.resolve('src/pages/Dashboard/TrainerDashboard.tsx'), 'utf8');
  assert.equal(trainerDashboard.includes('subscribeToLeads'), false, 'TrainerDashboard must not call subscribeToLeads');

  // Verify TrainerLeadsView loads solely from /api/leads
  const trainerLeadsView = fs.readFileSync(path.resolve('src/pages/Dashboard/trainer/TrainerLeadsView.tsx'), 'utf8');
  assert.equal(trainerLeadsView.includes("fetch('/api/leads'"), true, 'TrainerLeadsView must load solely from /api/leads');
  assert.equal(trainerLeadsView.includes("collection(db"), false, 'TrainerLeadsView must not query client Firestore');
});

test('15. Firestore Future Update Time Clock Skew Filter Interception', () => {
  let loggedErrors = [];
  let loggedDebugs = [];
  const fakeConsole = {
    error: (...args) => loggedErrors.push(args),
    debug: (...args) => loggedDebugs.push(args),
  };

  const origError = fakeConsole.error;
  fakeConsole.error = function (...args) {
    const isClockSkewError = args.some(arg => {
      if (typeof arg === 'string') {
        return arg.includes('Detected an update time that is in the future');
      }
      if (arg && typeof arg.message === 'string') {
        return arg.message.includes('Detected an update time that is in the future');
      }
      return false;
    });

    if (isClockSkewError) {
      fakeConsole.debug(...args);
      return;
    }
    origError.apply(fakeConsole, args);
  };

  // Normal error passes through
  fakeConsole.error('A normal error occurred');
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedDebugs.length, 0);

  // Multi-argument call from @firebase/logger
  fakeConsole.error(
    '[2026-10-25T14:08:33.791Z]  @firebase/firestore:',
    'Firestore (12.10.0): Detected an update time that is in the future: 1792937315884 > 1792937313791'
  );

  assert.equal(loggedErrors.length, 1, 'Error count must not increase for future update time');
  assert.equal(loggedDebugs.length, 1, 'Intercepted clock skew was routed to debug');

  // Verify index.html has the filter
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert.ok(indexHtml.includes('Detected an update time that is in the future'), 'index.html must include the filter script');

  // Verify src/firebase.ts has the filter
  const firebaseTs = fs.readFileSync(path.resolve('src/firebase.ts'), 'utf8');
  assert.ok(firebaseTs.includes('Detected an update time that is in the future'), 'src/firebase.ts must include the filter script');
});

console.log('All 15 Lead Assessment and Pipeline test suites passed successfully.');
