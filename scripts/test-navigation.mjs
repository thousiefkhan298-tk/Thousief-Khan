import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('Trainer navigation groups daily work and more management appropriately', async () => {
  const layoutContent = await readFile('src/components/Layout.tsx', 'utf8');

  // Verify daily work tabs
  assert.ok(layoutContent.includes("name: 'Home', tab: 'dashboard'"), 'Home tab must be defined for daily work');
  assert.ok(layoutContent.includes("name: 'Clients', tab: 'clients'"), 'Clients tab must be defined for daily work');
  assert.ok(layoutContent.includes("name: 'Sessions', tab: 'calendar'"), 'Sessions tab must be defined for daily work');
  assert.ok(layoutContent.includes("name: 'Plans', tab: 'workouts'"), 'Plans tab must be defined for daily work');
  assert.ok(layoutContent.includes("name: 'Payments', tab: 'payments'"), 'Payments tab must be defined for daily work');

  // Verify more management tabs
  assert.ok(layoutContent.includes("name: 'Attendance', tab: 'attendance'"), 'Attendance tab must be preserved');
  assert.ok(layoutContent.includes("name: 'Check-ins', tab: 'checkins'"), 'Check-ins tab must be preserved');
  assert.ok(layoutContent.includes("name: 'Drafts', tab: 'drafts'"), 'Drafts tab must be preserved');
  assert.ok(layoutContent.includes("name: 'Reports', tab: 'reports'"), 'Reports tab must be preserved');
  assert.ok(layoutContent.includes("name: 'Settings', tab: 'settings'"), 'Settings tab must be preserved');

  // Verify mobile bottom navigation has daily tabs plus More trigger
  assert.ok(layoutContent.includes('aria-label="Trainer mobile navigation"'), 'Trainer mobile bottom navigation must be present');
  assert.ok(layoutContent.includes('More management pages'), 'More modal/sheet must be accessible on mobile');
});

test('Client navigation presents Home, My Plan, Sessions, Progress, Profile with mobile bottom navigation', async () => {
  const layoutContent = await readFile('src/components/Layout.tsx', 'utf8');

  assert.ok(layoutContent.includes("name: 'Home', tab: 'home'"), 'Client Home tab present');
  assert.ok(layoutContent.includes("name: 'My Plan', tab: 'myplan'"), 'Client My Plan tab present');
  assert.ok(layoutContent.includes("name: 'Sessions', tab: 'sessions'"), 'Client Sessions tab present');
  assert.ok(layoutContent.includes("name: 'Progress', tab: 'progress'"), 'Client Progress tab present');
  assert.ok(layoutContent.includes("name: 'Profile', tab: 'profile'"), 'Client Profile tab present');

  assert.ok(layoutContent.includes('aria-label="Client mobile navigation"'), 'Client mobile bottom navigation must be present');
});

test('Touch targets and accessibility attributes meet minimum 44px AA standards', async () => {
  const layoutContent = await readFile('src/components/Layout.tsx', 'utf8');

  // Check for min 44px classes
  const touchTargetMatches = layoutContent.match(/min-h-\[44px\]/g);
  assert.ok(touchTargetMatches && touchTargetMatches.length >= 8, 'Layout must contain ample min-h-[44px] touch targets');

  // Check for aria-labels on icon-only buttons
  assert.ok(layoutContent.includes('aria-label="Open navigation menu"'), 'Hamburger menu must have aria-label');
  assert.ok(layoutContent.includes('aria-label="View system notifications"'), 'Notification bell must have aria-label');
  assert.ok(layoutContent.includes('aria-label="Toggle visual theme accent"'), 'Theme toggle must have aria-label');
  assert.ok(layoutContent.includes('aria-label="Go back to previous page"'), 'Back button must have aria-label');

  // Check for focus-visible outline
  assert.ok(layoutContent.includes('focus-visible:ring-2'), 'Interactive elements must support focus-visible rings');
});

test('Contextual Back button with safe fallback is present on non-root routes', async () => {
  const layoutContent = await readFile('src/components/Layout.tsx', 'utf8');

  assert.ok(layoutContent.includes('const showBackButton = location.pathname !== \'/dashboard\' && location.pathname !== \'/\';'), 'Back button conditional check present');
  assert.ok(layoutContent.includes('if (window.history.length > 1) {'), 'Safe fallback history check present');
  assert.ok(layoutContent.includes('navigate(-1);'), 'Navigate back called when history exists');
});

test('Vague military jargon replaced with clean human-readable sentence-case labels', async () => {
  const loginContent = await readFile('src/pages/Auth/LoginPage.tsx', 'utf8');
  const signupContent = await readFile('src/pages/Auth/SignupPage.tsx', 'utf8');
  const rosterContent = await readFile('src/components/ClientRoster.tsx', 'utf8');
  const layoutContent = await readFile('src/components/Layout.tsx', 'utf8');

  // Ensure military jargon is removed from functional labels
  assert.ok(!loginContent.includes('Join the Ranks'), 'LoginPage must not use "Join the Ranks"');
  assert.ok(!loginContent.includes('Identity (Email)'), 'LoginPage must use "Email address"');
  assert.ok(!loginContent.includes('Secret (Password)'), 'LoginPage must use "Password"');

  assert.ok(!signupContent.includes('Identity (Email)'), 'SignupPage must use "Email address"');
  assert.ok(!signupContent.includes('Secret (Password)'), 'SignupPage must use "Password"');

  assert.ok(!rosterContent.includes('ATHLETE ROSTER'), 'ClientRoster must not say "ATHLETE ROSTER"');
  assert.ok(!rosterContent.includes('Filter by Athlete Status'), 'ClientRoster must not say "Filter by Athlete Status"');
  assert.ok(!rosterContent.includes('Athlete Credentials'), 'ClientRoster must not say "Athlete Credentials"');

  assert.ok(!layoutContent.includes('SPEED FIT HQ'), 'Layout header must not have military screaming HQ');
});

test('Trainer tab aliases work for plans and sessions', async () => {
  const trainerDashboard = await readFile('src/pages/Dashboard/TrainerDashboard.tsx', 'utf8');

  assert.ok(trainerDashboard.includes("(currentTab === 'workouts' || currentTab === 'plans')"), 'Plans tab alias supported');
  assert.ok(trainerDashboard.includes("(currentTab === 'calendar' || currentTab === 'sessions')"), 'Sessions tab alias supported');
});
