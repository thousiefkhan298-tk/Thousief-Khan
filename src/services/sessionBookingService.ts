/**
 * SPEED FIT Session Booking & Payment Scheduling Engine
 * Enforces:
 * - 60-minute minimum notice for session booking requests in Asia/Kolkata (IST, UTC+5:30)
 * - Double-booking & overlap prevention
 * - Due-date payment reminder scheduling (3 days before, due date, overdue)
 */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

export function parseISTDateTime(dateStr: string, timeStr: string): Date {
  const cleanDate = dateStr.trim();
  const cleanTime = (timeStr || '00:00').trim().slice(0, 5);
  // Ensure format YYYY-MM-DDTHH:mm:00+05:30
  const isoWithOffset = `${cleanDate}T${cleanTime}:00+05:30`;
  const parsed = new Date(isoWithOffset);
  if (isNaN(parsed.getTime())) {
    // Fallback if parsing fails
    return new Date(`${cleanDate} ${cleanTime}`);
  }
  return parsed;
}

export function validateSixtyMinuteNotice(
  dateStr: string,
  timeStr: string,
  currentServerTimeMs: number = Date.now()
): { valid: boolean; minutesNotice: number; error?: string } {
  try {
    const sessionTime = parseISTDateTime(dateStr, timeStr);
    const sessionTimeMs = sessionTime.getTime();
    if (isNaN(sessionTimeMs)) {
      return { valid: false, minutesNotice: 0, error: 'Invalid date or time provided.' };
    }

    const diffMs = sessionTimeMs - currentServerTimeMs;
    const minutesNotice = Math.floor(diffMs / (60 * 1000));

    if (minutesNotice < 60) {
      return {
        valid: false,
        minutesNotice,
        error: `Session requests must be submitted at least 60 minutes before start time. (Notice provided: ${minutesNotice > 0 ? minutesNotice + ' minutes' : 'time has passed'}).`
      };
    }

    return { valid: true, minutesNotice };
  } catch (err: any) {
    return { valid: false, minutesNotice: 0, error: err.message || 'Validation failed' };
  }
}

export function checkOverlappingSessions(
  existingSessions: Array<{ date: string; time?: string; durationMinutes?: number; status: string }>,
  targetDate: string,
  targetTime: string,
  targetDurationMinutes: number = 60
): { hasConflict: boolean; conflictingSession?: any } {
  const targetStart = parseISTDateTime(targetDate, targetTime).getTime();
  const targetEnd = targetStart + targetDurationMinutes * 60 * 1000;

  for (const session of existingSessions) {
    // Only active/confirmed sessions cause blocking conflicts
    if (session.status !== 'Confirmed') continue;
    if (session.date !== targetDate) continue;

    const existingStart = parseISTDateTime(session.date, session.time || '00:00').getTime();
    const existingDuration = session.durationMinutes || 60;
    const existingEnd = existingStart + existingDuration * 60 * 1000;

    // Overlap condition: start < existingEnd && end > existingStart
    if (targetStart < existingEnd && targetEnd > existingStart) {
      return { hasConflict: true, conflictingSession: session };
    }
  }

  return { hasConflict: false };
}

export type ReminderStage = 'due_in_3_days' | 'due_today' | 'overdue' | null;

export function evaluatePaymentReminder(
  dueDateStr: string,
  status: string,
  balance: number,
  currentDate: Date = new Date()
): { shouldRemind: boolean; stage: ReminderStage; daysUntilDue: number; overdueDays: number } {
  const normalizedStatus = (status || '').toLowerCase().trim();
  if (normalizedStatus === 'paid' || balance <= 0) {
    return { shouldRemind: false, stage: null, daysUntilDue: 0, overdueDays: 0 };
  }

  // Parse YYYY-MM-DD
  const [dueY, dueM, dueD] = dueDateStr.split('-').map(Number);
  if (!dueY || !dueM || !dueD) {
    return { shouldRemind: false, stage: null, daysUntilDue: 0, overdueDays: 0 };
  }

  // Current calendar date in IST
  const istCurrent = new Date(currentDate.getTime() + (currentDate.getTimezoneOffset() * 60000) + IST_OFFSET_MS);
  const curY = istCurrent.getFullYear();
  const curM = istCurrent.getMonth() + 1;
  const curD = istCurrent.getDate();

  // Difference in calendar days
  const dueUtc = Date.UTC(dueY, dueM - 1, dueD);
  const curUtc = Date.UTC(curY, curM - 1, curD);
  const daysUntilDue = Math.round((dueUtc - curUtc) / (24 * 60 * 60 * 1000));

  if (daysUntilDue === 3) {
    return { shouldRemind: true, stage: 'due_in_3_days', daysUntilDue: 3, overdueDays: 0 };
  }

  if (daysUntilDue === 0) {
    return { shouldRemind: true, stage: 'due_today', daysUntilDue: 0, overdueDays: 0 };
  }

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    // Send reminder on day 1 overdue, and every 3 days thereafter (e.g. 1, 4, 7, 10...)
    const isReminderInterval = overdueDays === 1 || (overdueDays - 1) % 3 === 0;
    return {
      shouldRemind: isReminderInterval,
      stage: 'overdue',
      daysUntilDue,
      overdueDays
    };
  }

  return { shouldRemind: false, stage: null, daysUntilDue, overdueDays: 0 };
}
