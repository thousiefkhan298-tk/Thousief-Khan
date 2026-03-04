import fs from 'fs';
import path from 'path';
import { getDb } from './firebase';

const DB_FILE = path.join(process.cwd(), 'db.json');

async function migrate() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No db.json found. Skipping migration.');
    return;
  }

  try {
    const db = getDb();
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('Migrating data to Firestore...');

    const collections = [
      'users',
      'clientDetails',
      'healthAssessments',
      'fitnessAssessments',
      'workouts',
      'diets',
      'attendance',
      'payments',
      'notifications'
    ];

    for (const collectionName of collections) {
      const items = data[collectionName] || [];
      console.log(`Migrating ${items.length} items to ${collectionName}...`);
      
      const batch = db.batch();
      for (const item of items) {
        // Use ID if available, otherwise auto-generate
        const id = item.id || item.clientId || db.collection(collectionName).doc().id;
        const ref = db.collection(collectionName).doc(id);
        batch.set(ref, item, { merge: true });
      }
      await batch.commit();
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
