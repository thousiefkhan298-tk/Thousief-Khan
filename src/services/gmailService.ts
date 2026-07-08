import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

// Gmail Specific Scopes
export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose'
];

// In-memory token cache for Gmail
let cachedGmailToken: string | null = null;
let cachedGmailUserEmail: string | null = null;

/**
 * Initiates the Google Sign-In with popup requesting Gmail scopes.
 */
export async function authorizeGmail(): Promise<string> {
  if (cachedGmailToken) {
    return cachedGmailToken;
  }

  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach(scope => {
    provider.addScope(scope);
  });
  
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to retrieve Gmail Google Access Token.');
    }
    cachedGmailToken = credential.accessToken;
    cachedGmailUserEmail = result.user.email;
    return cachedGmailToken;
  } catch (error: any) {
    console.error('Gmail Google Authorization failed:', error);
    throw error;
  }
}

/**
 * Checks if Gmail access is authorized
 */
export function isGmailAuthorized(): boolean {
  return cachedGmailToken !== null;
}

/**
 * Returns the cached access token
 */
export function getGmailToken(): string | null {
  return cachedGmailToken;
}

/**
 * Sets the cached access token (useful if we want to share a single credential)
 */
export function setGmailToken(token: string, email?: string) {
  cachedGmailToken = token;
  if (email) cachedGmailUserEmail = email;
}

/**
 * Clears authorized Gmail state
 */
export function clearGmailAuthorization() {
  cachedGmailToken = null;
  cachedGmailUserEmail = null;
}

/**
 * Encodes string to clean base64url format suitable for Gmail API payload
 */
function toBase64Url(str: string): string {
  // UTF-8 safe base64 encoding
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sends an email using Gmail send API (client-side fetch)
 */
export async function sendGmailEmail(to: string, subject: string, htmlContent: string): Promise<any> {
  const token = cachedGmailToken;
  if (!token) {
    throw new Error('Gmail client is not authenticated. Please sign in to Gmail first.');
  }

  // Construct standard RFC-2822 MIME-compliant text message
  // Includes To, Subject, Content-Type, and UTF-8 charset
  const mailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent
  ];
  const emailRaw = mailLines.join('\r\n');
  const base64EncodedEmail = toBase64Url(emailRaw);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: base64EncodedEmail
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to send Gmail email');
  }

  return response.json();
}

/**
 * Lists emails query-filtered from Gmail
 */
export async function listGmailMessages(queryStr?: string): Promise<any[]> {
  const token = cachedGmailToken;
  if (!token) {
    throw new Error('Gmail client is not authenticated.');
  }

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15${
    queryStr ? `&q=${encodeURIComponent(queryStr)}` : ''
  }`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to list Gmail messages');
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Fetches detail elements of an individual email message
 */
export interface GmailMessageDetails {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  body: string;
}

export async function getGmailMessageDetails(messageId: string): Promise<GmailMessageDetails> {
  const token = cachedGmailToken;
  if (!token) {
    throw new Error('Gmail client is not authenticated.');
  }

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to get message details');
  }

  const data = await response.json();

  // Extract headers
  const headers = data.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '(Unknown Sender)';
  const dateStr = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

  // Extract body (MIME part decoding)
  let body = '';
  if (data.payload?.body?.data) {
    body = decodeBase64Safe(data.payload.body.data);
  } else if (data.payload?.parts) {
    // Traverse parts
    const parts = data.payload.parts;
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        body = decodeBase64Safe(part.body.data);
        break;
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        body = `<p>${decodeBase64Safe(part.body.data).replace(/\n/g, '<br/>')}</p>`;
      } else if (part.parts) {
        // Nested parts
        for (const subPart of part.parts) {
          if (subPart.mimeType === 'text/html' && subPart.body?.data) {
            body = decodeBase64Safe(subPart.body.data);
            break;
          }
        }
      }
    }
  }

  return {
    id: data.id,
    snippet: data.snippet || '',
    subject,
    from,
    date: dateStr,
    body: body || data.snippet || ''
  };
}

/**
 * Base64url safe decoder
 */
function decodeBase64Safe(encoded: string): string {
  try {
    // Replace base64url characters to standard base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    // Handle URL decoding properly for UTF-8
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (err) {
    try {
      return atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return 'Failed to decode message content.';
    }
  }
}
