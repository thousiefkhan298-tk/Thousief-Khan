import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let dbInstance: admin.firestore.Firestore | null = null;

const getConfig = () => {
  const configPath = path.join(process.cwd(), 'firebase-config.json');
  let fileConfig: any = {};
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.error('Error reading firebase-config.json');
    }
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || fileConfig.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || fileConfig.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || fileConfig.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n')
  };
};

export const getDb = () => {
  if (dbInstance) return dbInstance;

  if (!admin.apps.length) {
    const { projectId, clientEmail, privateKey } = getConfig();

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('Firebase configuration is missing. Falling back to local mode.');
      throw new Error('FIREBASE_CONFIG_MISSING');
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      dbInstance = admin.firestore();
      return dbInstance;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  dbInstance = admin.firestore();
  return dbInstance;
};

export const resetDb = () => {
  if (admin.apps.length) {
    Promise.all(admin.apps.map(app => app?.delete())).catch(console.error);
  }
  dbInstance = null;
};
