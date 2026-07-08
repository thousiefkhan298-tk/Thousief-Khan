import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

// Google Drive Specific Scopes
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

// In-memory token cache for Google Drive
let cachedDriveToken: string | null = null;
let cachedDriveUserEmail: string | null = null;

/**
 * Initiates the Google Sign-In with popup requesting Drive scopes.
 */
export async function authorizeDrive(): Promise<string> {
  if (cachedDriveToken) {
    return cachedDriveToken;
  }

  const provider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach(scope => {
    provider.addScope(scope);
  });
  
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error('Failed to retrieve Google Drive Access Token.');
    }
    cachedDriveToken = credential.accessToken;
    cachedDriveUserEmail = result.user.email;
    return cachedDriveToken;
  } catch (error: any) {
    console.error('Drive Google Authorization failed:', error);
    throw error;
  }
}

/**
 * Checks if Google Drive is authorized
 */
export function isDriveAuthorized(): boolean {
  return cachedDriveToken !== null;
}

/**
 * Returns the cached access token
 */
export function getDriveToken(): string | null {
  return cachedDriveToken;
}

/**
 * Sets the cached access token
 */
export function setDriveToken(token: string, email?: string) {
  cachedDriveToken = token;
  if (email) cachedDriveUserEmail = email;
}

/**
 * Clears authorized Drive state
 */
export function clearDriveAuthorization() {
  cachedDriveToken = null;
  cachedDriveUserEmail = null;
}

/**
 * Interface representing a Google Drive file
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

/**
 * Lists files in the user's Google Drive.
 * Filter can be provided to search for specific file types or keywords (e.g. name contains 'Speed Fit')
 */
export async function listDriveFiles(queryStr?: string): Promise<DriveFile[]> {
  const token = cachedDriveToken;
  if (!token) {
    throw new Error('Google Drive client is not authenticated.');
  }

  // Construct search query
  let q = "trashed = false";
  if (queryStr) {
    q += ` and name contains '${queryStr.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,webViewLink,iconLink,createdTime,size)&orderBy=createdTime desc&pageSize=20`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to list Google Drive files');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Uploads a text/HTML document directly into Google Drive (e.g., reports/workout details)
 */
export async function uploadTextToDrive(name: string, content: string, mimeType: string = 'text/plain'): Promise<DriveFile> {
  const token = cachedDriveToken;
  if (!token) {
    throw new Error('Google Drive client is not authenticated.');
  }

  // Multipart upload metadata and media
  const metadata = {
    name: name,
    mimeType: mimeType,
  };

  const boundary = 'speedfit_drive_upload_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartResponseBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,createdTime';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartResponseBody
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to upload file to Google Drive');
  }

  return response.json();
}

/**
 * Uploads a binary Blob (like PDF) to Google Drive
 */
export async function uploadBlobToDrive(name: string, blob: Blob): Promise<DriveFile> {
  const token = cachedDriveToken;
  if (!token) {
    throw new Error('Google Drive client is not authenticated.');
  }

  // First we upload the metadata, then we upload actual media.
  // We can do it in two steps or using multipart/related upload. Let's do multipart/related.
  const metadata = {
    name: name,
    mimeType: blob.type || 'application/pdf',
  };

  const boundary = 'speedfit_drive_upload_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Read blob to ArrayBuffer, then reconstruct multipart body as ArrayBuffer or Uint8Array
  const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + `Content-Type: ${blob.type || 'application/pdf'}\r\n\r\n`;
  const endPart = closeDelimiter;

  const metadataBuffer = new TextEncoder().encode(delimiter + metadataPart);
  const blobBuffer = new Uint8Array(await blob.arrayBuffer());
  const endBuffer = new TextEncoder().encode(endPart);

  // Combine arrays
  const totalLength = metadataBuffer.length + blobBuffer.length + endBuffer.length;
  const combinedArray = new Uint8Array(totalLength);
  combinedArray.set(metadataBuffer, 0);
  combinedArray.set(blobBuffer, metadataBuffer.length);
  combinedArray.set(endBuffer, metadataBuffer.length + blobBuffer.length);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,createdTime';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: combinedArray
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to upload binary file to Google Drive');
  }

  return response.json();
}

/**
 * Deletes a file from Google Drive
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = cachedDriveToken;
  if (!token) {
    throw new Error('Google Drive client is not authenticated.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to delete file from Google Drive');
  }
}
