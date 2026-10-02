import { auth, db } from '../firebase';
import { buildClaimProfile } from './profileIdentity';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  updateDoc, 
  writeBatch,
  deleteField
} from 'firebase/firestore';

/**
 * Runs as the CLIENT.
 * Finds a non-migrated user doc matching their email, merges it into users/{authUid},
 * and records claimedFromId + linkPending on the client's own doc.
 */
export async function claimPlaceholderAccount(authUid: string, email: string, overrides: any = {}) {
  try {
    const emailLower = email.trim().toLowerCase();
    const signedInUser = auth.currentUser;
    if (!signedInUser || signedInUser.uid !== authUid || signedInUser.email?.trim().toLowerCase() !== emailLower) {
      throw new Error('Sign in before linking your profile.');
    }
    const canonicalRef = doc(db, 'users', authUid);
    const current = await getDoc(canonicalRef);
    
    const hasCurrentDoc = current.exists();
    const currentData = hasCurrentDoc ? current.data() : {};
    
    if (hasCurrentDoc) {
      // Returning members keep their current data; never re-import an old copy.
      await setDoc(canonicalRef, buildClaimProfile(authUid, emailLower, {}, currentData, overrides), { merge: true });
      return null;
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', emailLower));
    const snap = await getDocs(q);

    let placeholderId: string | null = null;
    let placeholderData: any = null;

    for (const d of snap.docs) {
      if (d.id !== authUid && !d.data().isMigrated && !d.data().migratedTo) {
        if (!signedInUser.emailVerified) {
          throw new Error('Verify your email or use Google sign-in before linking an existing client profile.');
        }
        if (placeholderId) {
          throw new Error('More than one existing profile matches this email. Please ask your trainer to review the duplicates.');
        }
        placeholderId = d.id;
        placeholderData = d.data();
      }
    }

    const mergedData = buildClaimProfile(authUid, emailLower, placeholderData || {}, {}, overrides);

    if (placeholderId) {
      mergedData.claimedFromId = placeholderId;
      mergedData.linkPending = true;
    }

    await setDoc(canonicalRef, mergedData, { merge: true });
    console.log(`Successfully merged placeholder profile into ${authUid}. Placeholder ID: ${placeholderId}`);
    return placeholderId;
  } catch (err) {
    console.warn("Error claiming placeholder account:", err instanceof Error ? err.message : 'Unknown error');
    throw err;
  }
}

/**
 * Runs as the TRAINER.
 * Rewrites clientId across every collection, deletes the placeholder doc, and clears claimedFromId.
 */
export async function linkClientRecords(placeholderId: string, authUid: string) {
  try {
    console.log(`Starting record migration from ${placeholderId} to ${authUid}...`);
    const ops: Array<{ ref: any; type: 'update' | 'delete'; data?: any }> = [];

    // 1. Standard collections with 'clientId' field
    const collectionsToMigrate = [
      'workoutLogs',
      'trainerNotes',
      'workoutPlans',
      'attendance',
      'rescheduleRequests',
      'sessions',
      'dietPlans',
      'pendingDrafts',
      'paymentRecords',
      'progressPhotos',
      'scheduledWorkouts',
      'healthAssessments',
      'fitnessAssessments'
    ];

    for (const colName of collectionsToMigrate) {
      const q = query(collection(db, colName), where('clientId', '==', placeholderId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        ops.push({
          ref: d.ref,
          type: 'update',
          data: { clientId: authUid }
        });
      }
    }

    // 2. Favorites collection with 'uid' field
    const favQ = query(collection(db, 'favorites'), where('uid', '==', placeholderId));
    const favSnap = await getDocs(favQ);
    for (const d of favSnap.docs) {
      ops.push({
        ref: d.ref,
        type: 'update',
        data: { uid: authUid }
      });
    }

    // 3. Messages collection (contains participants array, senderId, receiverId)
    // Find messages where placeholderId is involved
    const msgRefs = new Map<string, any>();
    
    const qSender = query(collection(db, 'messages'), where('senderId', '==', placeholderId));
    const snapSender = await getDocs(qSender);
    for (const d of snapSender.docs) {
      msgRefs.set(d.id, d);
    }

    const qReceiver = query(collection(db, 'messages'), where('receiverId', '==', placeholderId));
    const snapReceiver = await getDocs(qReceiver);
    for (const d of snapReceiver.docs) {
      msgRefs.set(d.id, d);
    }

    const qParticipants = query(collection(db, 'messages'), where('participants', 'array-contains', placeholderId));
    const snapParticipants = await getDocs(qParticipants);
    for (const d of snapParticipants.docs) {
      msgRefs.set(d.id, d);
    }

    for (const d of msgRefs.values()) {
      const data = d.data();
      const updatedParticipants = (data.participants || []).map((p: string) => p === placeholderId ? authUid : p);
      const updatedSenderId = data.senderId === placeholderId ? authUid : data.senderId;
      const updatedReceiverId = data.receiverId === placeholderId ? authUid : data.receiverId;

      ops.push({
        ref: d.ref,
        type: 'update',
        data: {
          participants: updatedParticipants,
          senderId: updatedSenderId,
          receiverId: updatedReceiverId
        }
      });
    }

    // Add placeholder user doc deletion to the end of the operations
    ops.push({
      ref: doc(db, 'users', placeholderId),
      type: 'delete'
    });

    // Add real user doc update to clear the link pending fields
    ops.push({
      ref: doc(db, 'users', authUid),
      type: 'update',
      data: {
        claimedFromId: null,
        linkPending: false
      }
    });

    // Chunk transactions in batches of 450 to stay under the 500 cap
    const CHUNK_SIZE = 450;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'update') {
          batch.update(op.ref, op.data);
        } else if (op.type === 'delete') {
          batch.delete(op.ref);
        }
      }
      await batch.commit();
      console.log(`Committed account link batch of ${chunk.length} operations.`);
    }

    console.log(`Successfully migrated and linked all records for client ${authUid}.`);
  } catch (err) {
    console.error("Error linking client records:", err);
    throw err;
  }
}

async function hashPassword(rawPassword: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(rawPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Called on trainer dashboard load.
 * Loops through loaded client documents, links records if linkPending/claimedFromId is found,
 * and stamps trainerId on clients who don't have one.
 * Retrospectively hashes plain text passwords and auto-links duplicate placeholder records.
 */
export async function reconcileClientAccounts(clients: any[], trainerId: string) {
  try {
    for (const client of clients) {
      const cId = client.uid || client.id;
      if (!cId) continue;

      // 1. Stamp active trainerId onto unassigned or legacy clients
      if (!client.trainerId) {
        console.log(`Stamping active trainerId ${trainerId} on client ${cId}`);
        await updateDoc(doc(db, 'users', cId), { trainerId });
      }

      // 2. Retrospective Plaintext Password Hashing & Cleaning (Secures legacy invitation docs)
      const plainPassword = client.password || client.assignedPassword;
      if (plainPassword) {
        console.log(`Securing legacy plaintext password for client ${cId}`);
        try {
          const passwordHash = await hashPassword(plainPassword);
          await updateDoc(doc(db, 'users', cId), {
            passwordHash,
            password: deleteField(),
            assignedPassword: deleteField()
          });
        } catch (passErr) {
          console.error(`Failed to secure plaintext password for client ${cId}:`, passErr);
        }
      }

      // 3. Reconcile and link if pending link flag is set
      if (client.linkPending === true && client.claimedFromId) {
        console.log(`Found pending account link for client ${cId}. Resolving...`);
        await linkClientRecords(client.claimedFromId, cId);
      }

      // 4. Auto-linking of duplicate/orphaned placeholder documents by email
      const emailLower = (client.email || '').trim().toLowerCase();
      if (emailLower && cId.length > 20) { // cId is a 28-character Firebase Auth UID
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', emailLower));
          const snap = await getDocs(q);
          
          for (const d of snap.docs) {
            if (d.id !== cId && d.id.length <= 20) {
              const data = d.data();
              if (!data.isMigrated) {
                console.log(`Auto-linking orphaned placeholder ${d.id} into real client account ${cId} for email ${emailLower}`);
                // Lock the document from concurrent reconciliation
                await updateDoc(doc(db, 'users', d.id), { isMigrated: true });
                await linkClientRecords(d.id, cId);
              }
            }
          }
        } catch (linkErr) {
          console.error(`Failed during email-based duplicate link for client ${cId}:`, linkErr);
        }
      }
    }
  } catch (err) {
    console.error("Error during client reconciliation:", err);
  }
}
