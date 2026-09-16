import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

// Google Calendar Specific Scopes
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

// In-memory token cache for Google Calendar
let cachedCalendarToken: string | null = null;
let cachedCalendarUserEmail: string | null = null;

/**
 * Initiates the Google Sign-In with popup requesting Calendar scopes.
 */
export async function authorizeCalendar(): Promise<string> {
  if (cachedCalendarToken) {
    return cachedCalendarToken;
  }

  const provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach(scope => {
    provider.addScope(scope);
  });
  
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to retrieve Google Calendar Access Token.');
    }
    cachedCalendarToken = credential.accessToken;
    cachedCalendarUserEmail = result.user.email;
    return cachedCalendarToken;
  } catch (error: any) {
    console.error('Google Calendar Authorization failed:', error);
    throw error;
  }
}

/**
 * Checks if Google Calendar is authorized
 */
export function isCalendarAuthorized(): boolean {
  return cachedCalendarToken !== null;
}

/**
 * Returns the cached access token
 */
export function getCalendarToken(): string | null {
  return cachedCalendarToken;
}

/**
 * Sets the cached access token
 */
export function setCalendarToken(token: string, email?: string) {
  cachedCalendarToken = token;
  if (email) cachedCalendarUserEmail = email;
}

/**
 * Clears authorized Calendar state
 */
export function clearCalendarAuthorization() {
  cachedCalendarToken = null;
  cachedCalendarUserEmail = null;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  htmlLink?: string;
  attendees?: { email: string; responseStatus?: string }[];
}

/**
 * Fetches events from the user's primary Google Calendar
 */
export async function listCalendarEvents(timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
  const token = cachedCalendarToken;
  if (!token) {
    throw new Error('Google Calendar is not authenticated. Please link Google Calendar first.');
  }

  const now = new Date();
  const defaultMin = timeMin || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const defaultMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    defaultMin
  )}&timeMax=${encodeURIComponent(
    defaultMax
  )}&singleEvents=true&orderBy=startTime&maxResults=20`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to list Google Calendar events');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Creates a new event in the user's primary Google Calendar
 */
export async function createCalendarEvent(eventData: {
  summary: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  attendees?: string[];
}): Promise<CalendarEvent> {
  const token = cachedCalendarToken;
  if (!token) {
    throw new Error('Google Calendar is not authenticated.');
  }

  const payload: any = {
    summary: eventData.summary,
    description: eventData.description || 'Speed Fit High Performance Training Session',
    location: eventData.location || 'Speed Fit Athletic Studio',
    start: {
      dateTime: eventData.startISO,
    },
    end: {
      dateTime: eventData.endISO,
    }
  };

  if (eventData.attendees && eventData.attendees.length > 0) {
    payload.attendees = eventData.attendees.map(email => ({ email }));
  }

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to create Google Calendar event');
  }

  return response.json();
}

/**
 * Deletes an event from primary Google Calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = cachedCalendarToken;
  if (!token) {
    throw new Error('Google Calendar is not authenticated.');
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 410) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to delete Google Calendar event');
  }
}
