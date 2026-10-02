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
