import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { getDb, resetDb } from './firebase';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { exec } from 'child_process';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('send_message', async (message) => {
    const { firestore, local, isLocal } = getDatabase();
    const newMessage = { ...message, id: Date.now().toString(), timestamp: new Date().toISOString(), read: false };

    if (isLocal) {
      if (!local.messages) local.messages = [];
      local.messages.push(newMessage);
      saveLocalDb(local);
    } else {
      await firestore!.collection('messages').add(newMessage);
    }

    // Emit to receiver and sender (for confirmation)
    io.to(message.receiverId).emit('receive_message', newMessage);
    io.to(message.senderId).emit('message_sent', newMessage);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const DB_FILE = path.join(process.cwd(), 'db.json');

// Fallback local DB logic
function loadLocalDb() {
  const emptyDb = { users: [], clientDetails: [], healthAssessments: [], fitnessAssessments: [], workouts: [], diets: [], attendance: [], payments: [], notifications: [], workoutLogs: [], sessionRequests: [], trainerNotes: [], messages: [], progressPhotos: [] };
  if (!fs.existsSync(DB_FILE)) return emptyDb;
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return { ...emptyDb, ...data };
  } catch (e) {
    return emptyDb;
  }
}

function saveLocalDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper to get DB (Firestore or Local)
const getDatabase = () => {
  try {
    return { firestore: getDb(), isLocal: false };
  } catch (e) {
    return { local: loadLocalDb(), isLocal: true };
  }
};

// Config Management
app.get('/api/config', (req, res) => {
  const { isLocal } = getDatabase();
  const configPath = path.join(process.cwd(), 'firebase-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    res.json({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      hasKey: !!config.FIREBASE_PRIVATE_KEY,
      isConnected: !isLocal
    });
  } else {
    res.json({ projectId: '', clientEmail: '', hasKey: false, isConnected: !isLocal });
  }
});

app.post('/api/config', (req, res) => {
  const { projectId, clientEmail, privateKey } = req.body;
  const configPath = path.join(process.cwd(), 'firebase-config.json');
  const config = {
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_CLIENT_EMAIL: clientEmail,
    FIREBASE_PRIVATE_KEY: privateKey
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  resetDb();
  res.json({ success: true });
});

// Messages API
app.get('/api/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const messages = (local.messages || []).filter((m: any) => 
        (m.senderId === userId && m.receiverId === otherUserId) || 
        (m.senderId === otherUserId && m.receiverId === userId)
      );
      return res.json(messages);
    }

    const sent = await firestore!.collection('messages')
      .where('senderId', '==', userId)
      .where('receiverId', '==', otherUserId)
      .get();
    
    const received = await firestore!.collection('messages')
      .where('senderId', '==', otherUserId)
      .where('receiverId', '==', userId)
      .get();

    const messages = [
      ...sent.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...received.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Session Requests
app.get('/api/session-requests', async (req, res) => {
  try {
    const { clientId } = req.query;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      let requests = local.sessionRequests || [];
      if (clientId) {
        const validRequests = Array.isArray(requests) ? requests : [];
        requests = validRequests.filter((r: any) => r.clientId === clientId);
      }
      return res.json(requests);
    }

    let query = firestore!.collection('sessionRequests');
    if (clientId) {
      // @ts-ignore
      query = query.where('clientId', '==', clientId);
    }
    const snapshot = await query.get();
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session requests' });
  }
});

app.post('/api/session-requests', async (req, res) => {
  try {
    const request = { ...req.body, status: 'Pending', createdAt: new Date().toISOString() };
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      if (!local.sessionRequests) local.sessionRequests = [];
      const newRequest = { id: Date.now().toString(), ...request };
      local.sessionRequests.push(newRequest);
      saveLocalDb(local);
      io.emit('session_request_updated', newRequest);
      io.emit('client_updated', request.clientId);
      return res.json(newRequest);
    }

    const docRef = await firestore!.collection('sessionRequests').add(request);
    const newRequest = { id: docRef.id, ...request };
    io.emit('session_request_updated', newRequest);
    io.emit('client_updated', request.clientId);
    res.json(newRequest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session request' });
  }
});

app.put('/api/session-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const idx = local.sessionRequests.findIndex((r: any) => r.id === id);
      if (idx > -1) {
        local.sessionRequests[idx] = { ...local.sessionRequests[idx], status, notes };
        saveLocalDb(local);
        io.emit('session_request_updated', local.sessionRequests[idx]);
        io.emit('client_updated', local.sessionRequests[idx].clientId);
        return res.json(local.sessionRequests[idx]);
      }
      return res.status(404).json({ error: 'Request not found' });
    }

    await firestore!.collection('sessionRequests').doc(id).update({ status, notes });
    const updatedDoc = await firestore!.collection('sessionRequests').doc(id).get();
    const updated = updatedDoc.data();
    io.emit('session_request_updated', { id, ...updated });
    io.emit('client_updated', updated?.clientId);
    res.json({ id, ...updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session request' });
  }
});

// API Routes
app.get('/api/users', async (req, res) => {
  try {
    const { firestore, local, isLocal } = getDatabase();
    if (isLocal) return res.json(local.users);
    
    const snapshot = await firestore!.collection('users').get();
    const users = snapshot.docs.map(doc => doc.data());
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    const { firestore, local, isLocal } = getDatabase();
    
    if (isLocal) {
      const idx = local.users.findIndex((u: any) => u.id === user.id);
      if (idx > -1) local.users[idx] = user;
      else local.users.push(user);
      saveLocalDb(local);
      io.emit('users_updated');
      return res.json(user);
    }

    await firestore!.collection('users').doc(user.id).set(user, { merge: true });
    io.emit('users_updated');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.post('/api/users/status', async (req, res) => {
  try {
    const { userId, isOnline, lastActive } = req.body;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const idx = local.users.findIndex((u: any) => u.id === userId);
      if (idx > -1) {
        local.users[idx] = { ...local.users[idx], isOnline, lastActive };
        saveLocalDb(local);
        io.emit('users_updated');
        return res.json(local.users[idx]);
      }
      return res.status(404).json({ error: 'User not found' });
    }

    const userRef = firestore!.collection('users').doc(userId);
    const doc = await userRef.get();
    if (doc.exists) {
      await userRef.update({ isOnline, lastActive });
      io.emit('users_updated');
      res.json({ ...doc.data(), isOnline, lastActive });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/client-data/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      return res.json({
        user: (local.users || []).find((u: any) => u.id === clientId),
        details: (local.clientDetails || []).find((d: any) => d.clientId === clientId),
        health: (local.healthAssessments || []).find((d: any) => d.clientId === clientId),
        fitness: (local.fitnessAssessments || []).find((d: any) => d.clientId === clientId),
        workout: (local.workouts || []).find((d: any) => d.clientId === clientId),
        diet: (local.diets || []).find((d: any) => d.clientId === clientId),
        attendance: (local.attendance || []).filter((d: any) => d.clientId === clientId),
        payments: (local.payments || []).filter((d: any) => d.clientId === clientId),
        notifications: (local.notifications || []).filter((d: any) => d.clientId === clientId || d.clientId === 'all'),
        workoutLogs: (local.workoutLogs || []).filter((d: any) => d.clientId === clientId),
        sessionRequests: (local.sessionRequests || []).filter((d: any) => d.clientId === clientId),
        trainerNotes: (local.trainerNotes || []).filter((d: any) => d.clientId === clientId),
      });
    }

    const [user, details, health, fitness, workout, diet, attendance, payments, notifications, workoutLogs, sessionRequests, trainerNotes] = await Promise.all([
      firestore!.collection('users').doc(clientId).get(),
      firestore!.collection('clientDetails').doc(clientId).get(),
      firestore!.collection('healthAssessments').doc(clientId).get(),
      firestore!.collection('fitnessAssessments').doc(clientId).get(),
      firestore!.collection('workouts').doc(clientId).get(),
      firestore!.collection('diets').doc(clientId).get(),
      firestore!.collection('attendance').where('clientId', '==', clientId).get(),
      firestore!.collection('payments').where('clientId', '==', clientId).get(),
      firestore!.collection('notifications').where('clientId', 'in', [clientId, 'all']).get(),
      firestore!.collection('workoutLogs').where('clientId', '==', clientId).get(),
      firestore!.collection('sessionRequests').where('clientId', '==', clientId).get(),
      firestore!.collection('trainerNotes').where('clientId', '==', clientId).get(),
    ]);

    res.json({
      user: user.data(),
      details: details.data(),
      health: health.data(),
      fitness: fitness.data(),
      workout: workout.data(),
      diet: diet.data(),
      attendance: attendance.docs.map(doc => doc.data()),
      payments: payments.docs.map(doc => doc.data()),
      notifications: notifications.docs.map(doc => doc.data()),
      workoutLogs: workoutLogs.docs.map(doc => doc.data()),
      sessionRequests: sessionRequests.docs.map(doc => doc.data()),
      trainerNotes: trainerNotes.docs.map(doc => doc.data()),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client data' });
  }
});

app.post('/api/trainer-notes', async (req, res) => {
  try {
    const note = { ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      if (!local.trainerNotes) local.trainerNotes = [];
      const newNote = { id: Date.now().toString(), ...note };
      local.trainerNotes.push(newNote);
      saveLocalDb(local);
      io.emit('client_updated', note.clientId);
      return res.json(newNote);
    }

    const docRef = await firestore!.collection('trainerNotes').add(note);
    const newNote = { id: docRef.id, ...note };
    io.emit('client_updated', note.clientId);
    res.json(newNote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save trainer note' });
  }
});

app.post('/api/client-details', async (req, res) => {
  try {
    const { clientId, ...data } = req.body;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const idx = local.clientDetails.findIndex((i: any) => i.clientId === clientId);
      if (idx > -1) local.clientDetails[idx] = { clientId, ...data };
      else local.clientDetails.push({ clientId, ...data });
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json({ success: true });
    }

    await firestore!.collection('clientDetails').doc(clientId).set({ clientId, ...data }, { merge: true });
    io.emit('client_updated', clientId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save client details' });
  }
});

app.post('/api/health-assessment', async (req, res) => {
  try {
    const { clientId, ...data } = req.body;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const idx = local.healthAssessments.findIndex((i: any) => i.clientId === clientId);
      if (idx > -1) local.healthAssessments[idx] = { clientId, ...data };
      else local.healthAssessments.push({ clientId, ...data });
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json({ success: true });
    }

    await firestore!.collection('healthAssessments').doc(clientId).set({ clientId, ...data }, { merge: true });
    io.emit('client_updated', clientId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save health assessment' });
  }
});

app.post('/api/fitness-assessment', async (req, res) => {
  try {
    const { clientId, ...data } = req.body;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const idx = local.fitnessAssessments.findIndex((i: any) => i.clientId === clientId);
      if (idx > -1) local.fitnessAssessments[idx] = { clientId, ...data };
      else local.fitnessAssessments.push({ clientId, ...data });
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json({ success: true });
    }

    await firestore!.collection('fitnessAssessments').doc(clientId).set({ clientId, ...data }, { merge: true });
    io.emit('client_updated', clientId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save fitness assessment' });
  }
});

app.post('/api/workouts', async (req, res) => {
  try {
    const { clientId, plan } = req.body;
    const { firestore, local, isLocal } = getDatabase();
    const newPlan = { id: Date.now().toString(), clientId, plan, updatedAt: new Date().toISOString() };
    const notification = {
      id: Date.now().toString(),
      clientId,
      title: 'New Workout Plan',
      message: 'Your trainer has updated your training routine.',
      date: new Date().toISOString(),
      read: false
    };

    if (isLocal) {
      const idx = local.workouts.findIndex((i: any) => i.clientId === clientId);
      if (idx > -1) local.workouts[idx] = newPlan;
      else local.workouts.push(newPlan);
      local.notifications.push(notification);
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json(newPlan);
    }

    await firestore!.collection('workouts').doc(clientId).set(newPlan);
    await firestore!.collection('notifications').add(notification);
    io.emit('client_updated', clientId);
    res.json(newPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save workout' });
  }
});

app.post('/api/diets', async (req, res) => {
  try {
    const { clientId, plan } = req.body;
    const { firestore, local, isLocal } = getDatabase();
    const newPlan = { id: Date.now().toString(), clientId, plan, updatedAt: new Date().toISOString() };
    const notification = {
      id: Date.now().toString(),
      clientId,
      title: 'Nutrition Update',
      message: 'A new diet plan has been assigned to you.',
      date: new Date().toISOString(),
      read: false
    };

    if (isLocal) {
      const idx = local.diets.findIndex((i: any) => i.clientId === clientId);
      if (idx > -1) local.diets[idx] = newPlan;
      else local.diets.push(newPlan);
      local.notifications.push(notification);
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json(newPlan);
    }

    await firestore!.collection('diets').doc(clientId).set(newPlan);
    await firestore!.collection('notifications').add(notification);
    io.emit('client_updated', clientId);
    res.json(newPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save diet' });
  }
});

app.post('/api/workout-logs', async (req, res) => {
  try {
    const log = req.body;
    const { clientId } = log;
    console.log(`[API] Saving workout log for client: ${clientId}`);

    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      if (!local.workoutLogs) local.workoutLogs = [];
      local.workoutLogs.push(log);
      
      // Update user's last active timestamp
      const userIdx = local.users.findIndex((u: any) => u.id === clientId);
      if (userIdx > -1) {
        local.users[userIdx].lastActive = new Date().toISOString();
      }

      saveLocalDb(local);
      console.log(`[API] Local DB updated. Emitting client_updated for ${clientId}`);
      io.emit('client_updated', clientId);
      io.emit('users_updated'); // Also update user list
      return res.json(log);
    }

    await firestore!.collection('workoutLogs').add(log);
    await firestore!.collection('users').doc(clientId).update({
      lastActive: new Date().toISOString()
    });
    
    console.log(`[API] Firestore updated. Emitting client_updated for ${clientId}`);
    io.emit('client_updated', clientId);
    io.emit('users_updated');
    res.json(log);
  } catch (error) {
    console.error('[API] Failed to save workout log:', error);
    res.status(500).json({ error: 'Failed to save workout log' });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { clientId, status } = req.body;
    const { firestore, local, isLocal } = getDatabase();
    const log = { id: Date.now().toString(), clientId, date: new Date().toISOString(), status };

    if (isLocal) {
      local.attendance.push(log);
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json(log);
    }

    await firestore!.collection('attendance').add(log);
    io.emit('client_updated', clientId);
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const payment = req.body;
    const { firestore, local, isLocal } = getDatabase();
    const notification = {
      id: Date.now().toString(),
      clientId: payment.clientId,
      title: 'Payment Update',
      message: `Your payment status for ${payment.package} is now ${payment.status}.`,
      date: new Date().toISOString(),
      read: false
    };

    if (isLocal) {
      const idx = local.payments.findIndex((i: any) => i.id === payment.id);
      if (idx > -1) local.payments[idx] = payment;
      else local.payments.push(payment);
      local.notifications.push(notification);
      saveLocalDb(local);
      io.emit('client_updated', payment.clientId);
      return res.json(payment);
    }

    await firestore!.collection('payments').doc(payment.id).set(payment, { merge: true });
    await firestore!.collection('notifications').add(notification);
    io.emit('client_updated', payment.clientId);
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save payment' });
  }
});

app.post('/api/notifications/read', async (req, res) => {
  try {
    const { clientId } = req.body;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      local.notifications.forEach((n: any) => {
        if (n.clientId === clientId) n.read = true;
      });
      saveLocalDb(local);
      io.emit('client_updated', clientId);
      return res.json({ success: true });
    }

    const snapshot = await firestore!.collection('notifications').where('clientId', '==', clientId).get();
    const batch = firestore!.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
    io.emit('client_updated', clientId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const clients = (local.users || []).filter((u: any) => u.role === 'CLIENT');
      const today = new Date().toISOString().split('T')[0];
      const missedToday = (local.attendance || []).filter((a: any) => a.date && a.date.startsWith(today) && a.status === 'Missed').length;
      const pendingPayments = (local.payments || []).filter((p: any) => p.status === 'Pending' || p.status === 'Overdue').length;
      const activeSessions = (local.attendance || []).filter((a: any) => a.status === 'Present').length;
      return res.json({ totalClients: clients.length, pendingPayments, activeSessions, missedToday });
    }

    const [users, attendance, payments] = await Promise.all([
      firestore!.collection('users').where('role', '==', 'CLIENT').get(),
      firestore!.collection('attendance').get(),
      firestore!.collection('payments').get(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const missedToday = attendance.docs.filter(doc => {
      const data = doc.data();
      return data.date.startsWith(today) && data.status === 'Missed';
    }).length;

    const pendingPayments = payments.docs.filter(doc => {
      const data = doc.data();
      return data.status === 'Pending' || data.status === 'Overdue';
    }).length;

    const activeSessions = attendance.docs.filter(doc => doc.data().status === 'Present').length;

    res.json({
      totalClients: users.size,
      pendingPayments,
      activeSessions,
      missedToday
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/activity', async (req, res) => {
  try {
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const activities = [
        ...(local.attendance || []).map((a: any) => ({
          id: a.id,
          type: 'ATTENDANCE',
          title: `Attendance: ${a.status}`,
          description: `${(local.users || []).find((u: any) => u.id === a.clientId)?.name || 'Client'} was marked ${a.status.toLowerCase()}.`,
          date: a.date
        })),
        ...(local.payments || []).map((p: any) => ({
          id: p.id,
          type: 'PAYMENT',
          title: `Payment: ${p.status}`,
          description: `${(local.users || []).find((u: any) => u.id === p.clientId)?.name || 'Client'} payment for ${p.package} is ${p.status.toLowerCase()}.`,
          date: p.startDate
        }))
      ];
      return res.json(activities.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15));
    }

    const [attendance, payments, users] = await Promise.all([
      firestore!.collection('attendance').orderBy('date', 'desc').limit(15).get(),
      firestore!.collection('payments').orderBy('startDate', 'desc').limit(15).get(),
      firestore!.collection('users').get(),
    ]);

    const userMap = new Map();
    users.docs.forEach(doc => userMap.set(doc.id, doc.data().name || 'Client'));

    const activities = [
      ...attendance.docs.map(doc => {
        const a = doc.data();
        return {
          id: doc.id,
          type: 'ATTENDANCE',
          title: `Attendance: ${a.status}`,
          description: `${userMap.get(a.clientId) || 'Client'} was marked ${a.status.toLowerCase()}.`,
          date: a.date
        };
      }),
      ...payments.docs.map(doc => {
        const p = doc.data();
        return {
          id: doc.id,
          type: 'PAYMENT',
          title: `Payment: ${p.status}`,
          description: `${userMap.get(p.clientId) || 'Client'} payment for ${p.package} is ${p.status.toLowerCase()}.`,
          date: p.startDate
        };
      })
    ];

    res.json(activities.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

app.get('/api/download-source', (req, res) => {
  const archiveName = 'speed-fit-source.tar.gz';
  const archivePath = path.join(process.cwd(), archiveName);
  
  // Create a tarball of the current directory, excluding node_modules, dist, and .git
  const command = `tar --exclude="./node_modules" --exclude="./dist" --exclude="./.git" --exclude="./${archiveName}" -czvf ${archiveName} .`;
  
  exec(command, (error) => {
    if (error) {
      console.error('Error creating archive:', error);
      return res.status(500).send('Failed to create source archive');
    }
    
    res.download(archivePath, archiveName, (err) => {
      if (err) {
        console.error('Error downloading archive:', err);
      }
      // Clean up the archive file after download
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
      }
    });
  });
});

app.post('/api/progress-photos', async (req, res) => {
  try {
    const photo = { ...req.body, id: Date.now().toString(), date: new Date().toISOString() };
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      if (!local.progressPhotos) local.progressPhotos = [];
      local.progressPhotos.push(photo);
      saveLocalDb(local);
      io.emit('client_updated', photo.clientId);
      return res.json(photo);
    }

    await firestore!.collection('progressPhotos').add(photo);
    io.emit('client_updated', photo.clientId);
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save progress photo' });
  }
});

app.get('/api/progress-photos/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { firestore, local, isLocal } = getDatabase();

    if (isLocal) {
      const photos = (local.progressPhotos || []).filter((p: any) => p.clientId === clientId);
      return res.json(photos);
    }

    const snapshot = await firestore!.collection('progressPhotos').where('clientId', '==', clientId).get();
    const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress photos' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
