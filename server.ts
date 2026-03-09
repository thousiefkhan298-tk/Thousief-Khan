import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'speedfit-secret-key-2026';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(cors());
  app.use(express.json());

  // Database setup
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Initialize tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      onboardingCompleted BOOLEAN DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS clientDetails (
      clientId TEXT PRIMARY KEY,
      fullName TEXT,
      email TEXT,
      age TEXT,
      dob TEXT,
      gender TEXT,
      phoneNumber TEXT,
      address TEXT,
      emergencyContact TEXT,
      FOREIGN KEY(clientId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS healthAssessments (
      clientId TEXT PRIMARY KEY,
      conditions TEXT,
      otherConditions TEXT,
      smoking BOOLEAN,
      alcohol BOOLEAN,
      stress TEXT,
      occupation TEXT,
      sleepHours TEXT,
      currentlyActive BOOLEAN,
      pastExperience TEXT,
      trainingDaysPerWeek TEXT,
      goals TEXT,
      targetWeight TEXT,
      targetDate TEXT,
      height TEXT,
      weight TEXT,
      waist TEXT,
      bloodPressure TEXT,
      painActivities TEXT,
      medications TEXT,
      confirmed BOOLEAN,
      FOREIGN KEY(clientId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workoutLogs (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      date TEXT,
      entries TEXT,
      notes TEXT,
      FOREIGN KEY(clientId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      senderId TEXT,
      receiverId TEXT,
      content TEXT,
      timestamp TEXT,
      read BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS favoriteExercises (
      id TEXT PRIMARY KEY,
      trainerId TEXT,
      name TEXT,
      defaultSets TEXT,
      defaultReps TEXT
    );

    CREATE TABLE IF NOT EXISTS trainerNotes (
      id TEXT PRIMARY KEY,
      trainerId TEXT,
      clientId TEXT,
      note TEXT,
      updatedAt TEXT,
      FOREIGN KEY(trainerId) REFERENCES users(id),
      FOREIGN KEY(clientId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workoutPlans (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      plan TEXT,
      updatedAt TEXT,
      FOREIGN KEY(clientId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      date TEXT,
      status TEXT,
      FOREIGN KEY(clientId) REFERENCES users(id)
    );
  `);

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name, role, onboardingCompleted } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Math.random().toString(36).substring(2, 15);
    const createdAt = new Date().toISOString();

    try {
      await db.run(
        'INSERT INTO users (id, email, password, name, role, onboardingCompleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, email, hashedPassword, name, role, onboardingCompleted ? 1 : 0, createdAt]
      );
      
      const token = jwt.sign({ id, email, role }, JWT_SECRET);
      res.json({ token, user: { id, email, name, role, onboardingCompleted } });
    } catch (error: any) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        onboardingCompleted: !!user.onboardingCompleted 
      } 
    });
  });

  app.get('/api/me', authenticateToken, async (req: any, res) => {
    const user = await db.get('SELECT id, email, name, role, onboardingCompleted FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.sendStatus(404);
    res.json({ ...user, onboardingCompleted: !!user.onboardingCompleted });
  });

  app.get('/api/users', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'TRAINER') return res.sendStatus(403);
    const users = await db.all('SELECT id, email, name, role, onboardingCompleted FROM users WHERE role = "CLIENT"');
    res.json(users);
  });

  app.get('/api/users/:id', authenticateToken, async (req: any, res) => {
    const user = await db.get('SELECT id, email, name, role, onboardingCompleted FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.sendStatus(404);
    
    const details = await db.get('SELECT * FROM clientDetails WHERE clientId = ?', [req.params.id]);
    const health = await db.get('SELECT * FROM healthAssessments WHERE clientId = ?', [req.params.id]);
    
    res.json({ 
      ...user, 
      onboardingCompleted: !!user.onboardingCompleted,
      details,
      health: health ? {
        ...health,
        conditions: JSON.parse(health.conditions || '[]'),
        goals: JSON.parse(health.goals || '[]'),
        painActivities: JSON.parse(health.painActivities || '[]')
      } : null
    });
  });

  app.get('/api/workout-logs', authenticateToken, async (req: any, res) => {
    const { clientId } = req.query;
    let logs;
    if (req.user.role === 'TRAINER') {
      logs = await db.all('SELECT * FROM workoutLogs WHERE clientId = ? ORDER BY date DESC', [clientId]);
    } else {
      logs = await db.all('SELECT * FROM workoutLogs WHERE clientId = ? ORDER BY date DESC', [req.user.id]);
    }
    res.json(logs.map(l => ({ ...l, entries: JSON.parse(l.entries) })));
  });

  app.post('/api/workout-logs', authenticateToken, async (req: any, res) => {
    const { clientId, date, entries, notes } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    await db.run(
      'INSERT INTO workoutLogs (id, clientId, date, entries, notes) VALUES (?, ?, ?, ?, ?)',
      [id, clientId || req.user.id, date, JSON.stringify(entries), notes]
    );
    res.json({ id });
  });

  app.delete('/api/workout-logs/:id', authenticateToken, async (req: any, res) => {
    await db.run('DELETE FROM workoutLogs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/favorites', authenticateToken, async (req: any, res) => {
    const favs = await db.all('SELECT * FROM favoriteExercises WHERE trainerId = ?', [req.user.id]);
    res.json(favs);
  });

  app.post('/api/favorites', authenticateToken, async (req: any, res) => {
    const { name, defaultSets, defaultReps } = req.body;
    const existing = await db.get('SELECT * FROM favoriteExercises WHERE trainerId = ? AND LOWER(name) = LOWER(?)', [req.user.id, name]);
    
    if (existing) {
      await db.run('DELETE FROM favoriteExercises WHERE id = ?', [existing.id]);
      res.json({ success: true, removed: true });
    } else {
      const id = Math.random().toString(36).substring(2, 15);
      await db.run(
        'INSERT INTO favoriteExercises (id, trainerId, name, defaultSets, defaultReps) VALUES (?, ?, ?, ?, ?)',
        [id, req.user.id, name, defaultSets, defaultReps]
      );
      res.json({ id, success: true, added: true });
    }
  });

  app.get('/api/messages', authenticateToken, async (req: any, res) => {
    const { otherId } = req.query;
    const messages = await db.all(
      'SELECT * FROM messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) ORDER BY timestamp ASC',
      [req.user.id, otherId, otherId, req.user.id]
    );
    res.json(messages);
  });

  app.get('/api/messages/unread', authenticateToken, async (req: any, res) => {
    const messages = await db.all(
      'SELECT * FROM messages WHERE receiverId = ? AND read = 0',
      [req.user.id]
    );
    res.json(messages);
  });

  app.post('/api/messages', authenticateToken, async (req: any, res) => {
    const { receiverId, content } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    const timestamp = new Date().toISOString();
    await db.run(
      'INSERT INTO messages (id, senderId, receiverId, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, receiverId, content, timestamp]
    );
    res.json({ id, timestamp });
  });

  app.post('/api/onboarding', authenticateToken, async (req: any, res) => {
    const { clientDetails, healthAssessment } = req.body;
    const userId = req.user.id;

    await db.run(
      'INSERT OR REPLACE INTO clientDetails (clientId, fullName, email, age, dob, gender, phoneNumber, address, emergencyContact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, clientDetails.fullName, clientDetails.email, clientDetails.age, clientDetails.dob, clientDetails.gender, clientDetails.phoneNumber, clientDetails.address, clientDetails.emergencyContact]
    );

    await db.run(
      'INSERT OR REPLACE INTO healthAssessments (clientId, conditions, otherConditions, smoking, alcohol, stress, occupation, sleepHours, currentlyActive, pastExperience, trainingDaysPerWeek, goals, targetWeight, targetDate, height, weight, waist, bloodPressure, painActivities, medications, confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId, 
        JSON.stringify(healthAssessment.conditions), 
        healthAssessment.otherConditions, 
        healthAssessment.smoking ? 1 : 0, 
        healthAssessment.alcohol ? 1 : 0, 
        healthAssessment.stress, 
        healthAssessment.occupation, 
        healthAssessment.sleepHours, 
        healthAssessment.currentlyActive ? 1 : 0, 
        healthAssessment.pastExperience, 
        healthAssessment.trainingDaysPerWeek, 
        JSON.stringify(healthAssessment.goals), 
        healthAssessment.targetWeight, 
        healthAssessment.targetDate, 
        healthAssessment.height, 
        healthAssessment.weight, 
        healthAssessment.waist, 
        healthAssessment.bloodPressure, 
        JSON.stringify(healthAssessment.painActivities), 
        healthAssessment.medications, 
        1
      ]
    );

    await db.run('UPDATE users SET onboardingCompleted = 1, name = ? WHERE id = ?', [clientDetails.fullName, userId]);
    res.json({ success: true });
  });

  // Workout Plans
  app.get('/api/workout-plans/:clientId', authenticateToken, async (req: any, res) => {
    const plans = await db.all('SELECT * FROM workoutPlans WHERE clientId = ? ORDER BY updatedAt DESC', [req.params.clientId]);
    res.json(plans);
  });

  app.post('/api/workout-plans', authenticateToken, async (req: any, res) => {
    const { id, clientId, plan, updatedAt } = req.body;
    if (id) {
      await db.run('UPDATE workoutPlans SET plan = ?, updatedAt = ? WHERE id = ?', [plan, updatedAt, id]);
      res.json({ id, clientId, plan, updatedAt });
    } else {
      const newId = Math.random().toString(36).substring(2, 15);
      await db.run('INSERT INTO workoutPlans (id, clientId, plan, updatedAt) VALUES (?, ?, ?, ?)', [newId, clientId, plan, updatedAt]);
      res.json({ id: newId, clientId, plan, updatedAt });
    }
  });

  app.delete('/api/workout-plans/:id', authenticateToken, async (req: any, res) => {
    await db.run('DELETE FROM workoutPlans WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // Trainer Notes
  app.get('/api/trainer-notes/:clientId', authenticateToken, async (req: any, res) => {
    const notes = await db.all('SELECT * FROM trainerNotes WHERE clientId = ? ORDER BY updatedAt DESC', [req.params.clientId]);
    res.json(notes);
  });

  app.post('/api/trainer-notes', authenticateToken, async (req: any, res) => {
    const { id, trainerId, clientId, note, updatedAt } = req.body;
    if (id) {
      await db.run('UPDATE trainerNotes SET note = ?, updatedAt = ? WHERE id = ?', [note, updatedAt, id]);
      res.json({ id, trainerId, clientId, note, updatedAt });
    } else {
      const newId = Math.random().toString(36).substring(2, 15);
      await db.run('INSERT INTO trainerNotes (id, trainerId, clientId, note, updatedAt) VALUES (?, ?, ?, ?, ?)', [newId, trainerId, clientId, note, updatedAt]);
      res.json({ id: newId, trainerId, clientId, note, updatedAt });
    }
  });

  app.delete('/api/trainer-notes/:id', authenticateToken, async (req: any, res) => {
    await db.run('DELETE FROM trainerNotes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // Attendance
  app.get('/api/attendance/:clientId', authenticateToken, async (req: any, res) => {
    const attendance = await db.all('SELECT * FROM attendance WHERE clientId = ? ORDER BY date DESC', [req.params.clientId]);
    res.json(attendance);
  });

  app.post('/api/attendance', authenticateToken, async (req: any, res) => {
    const { clientId, date, status } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    await db.run('INSERT INTO attendance (id, clientId, date, status) VALUES (?, ?, ?, ?)', [id, clientId, date, status]);
    res.json({ id, clientId, date, status });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
