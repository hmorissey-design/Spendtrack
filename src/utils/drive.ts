/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Since Firebase token persists but OAuth access token might be in-memory only,
        // we might need to prompt login or we'll recover on the next interaction.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogleCheck = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

// GOOGLE DRIVE BACKUP & RESTORE METHODS
const BACKUP_FILENAME = 'spendtrack_backup.json';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * Searches for are existing backup file on Google Drive (within application's file permissions)
 */
export async function findBackupFile(accessToken: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILENAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to list space files: ${response.statusText} (${errorDetails})`);
  }

  const result = await response.json();
  if (result.files && result.files.length > 0) {
    return result.files[0] as DriveFileInfo;
  }
  return null;
}

/**
 * Backs up JSON string to Google Drive.
 * If file already exists, it is updated. Otherwise, a new file gets created.
 */
export async function saveBackupToDrive(accessToken: string, fileContent: string): Promise<DriveFileInfo> {
  const existingFile = await findBackupFile(accessToken);

  if (existingFile) {
    // 1. Update Existing File Content using media upload PATCH
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update backup file: ${response.statusText} (${errorText})`);
    }

    // Return the updated file info with current time
    return {
      id: existingFile.id,
      name: BACKUP_FILENAME,
      modifiedTime: new Date().toISOString(),
    };
  } else {
    // 2. Create a brand new backup file using multipart POST
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
    };

    const boundary = 'spend_track_upload_boundary_xyz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody = 
      delimiter + 
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' + 
      JSON.stringify(metadata) + 
      delimiter + 
      'Content-Type: application/json\r\n\r\n' + 
      fileContent + 
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime';
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create backup file: ${response.statusText} (${errorText})`);
    }

    const createdFile = await response.json();
    return createdFile as DriveFileInfo;
  }
}

/**
 * Downloads Backup file content from Google Drive
 */
export async function downloadBackupFromDrive(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download backup content: ${response.statusText} (${errorText})`);
  }

  return await response.text();
}
