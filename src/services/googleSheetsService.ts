import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

// Google Sheets scope
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// In-memory token cache
let cachedAccessToken: string | null = null;

/**
 * Initiates the Google Sign-In with popup to request Google Sheets access.
 */
export async function authorizeGoogleSheets(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_SHEETS_SCOPE);
  // Ensure we request incremental authorization if needed
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to retrieve Google Access Token.');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error: any) {
    console.error('Google Sheets Authorization failed:', error);
    throw error;
  }
}

/**
 * Checks if the user is already authorized
 */
export function isAuthorizedWithGoogle(): boolean {
  return cachedAccessToken !== null;
}

/**
 * Invalidates the cached token (e.g. on log out)
 */
export function clearGoogleAuthorization() {
  cachedAccessToken = null;
}

/**
 * Creates a new Spreadsheet with custom sheet/tab names
 */
export async function createGoogleSpreadsheet(
  title: string,
  tabNames: string[],
  token: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: tabNames.map(name => ({
        properties: {
          title: name
        }
      }))
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to create Google Spreadsheet');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`
  };
}

/**
 * Writes/Updates cell values for a given range
 */
export async function updateSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  token: string
): Promise<any> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to update sheet values');
  }

  return response.json();
}

/**
 * Reads cell values from a specified Google Sheet range.
 */
export async function getSheetValues(
  spreadsheetId: string,
  range: string,
  token: string
): Promise<any[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to fetch Google Sheet data. Please check the Spreadsheet ID, target sheet name, and access permissions.');
  }

  const data = await response.json();
  return data.values || [];
}

