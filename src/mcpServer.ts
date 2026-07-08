import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import { collection, getDocs, doc, setDoc, query, where, addDoc } from "firebase/firestore";
import { db } from "./firebase.js";

// Initialize high-level Model Context Protocol (MCP) Server for Claude Integration
export const mcpServer = new McpServer({
  name: "speedfit-coach-mcp",
  version: "1.0.0"
});

// Map to track active client SSE connections
const activeTransports = new Map<string, SSEServerTransport>();

// --- TOOL 1: LIST REGISTERED CLIENT ATHLETES ---
mcpServer.tool(
  "list_athletes",
  "Retrieve all registered client athletes from the Speed Fit database.",
  {},
  async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "CLIENT"));
      const snapshot = await getDocs(q);
      const athletes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, count: athletes.length, athletes }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to retrieve active athletes: ${err.message}`
          }
        ]
      };
    }
  }
);

// --- TOOL 2: GET DETAILED ATHLETE PROFILE DOSSIER ---
mcpServer.tool(
  "get_athlete_dossier",
  "Fetch complete onboarding questionnaire, health assessments, biometric measurements, and physical targets of a specific client athlete.",
  {
    clientId: z.string().describe("The unique registration document ID of the client athlete.")
  },
  async ({ clientId }) => {
    try {
      // 1. Fetch Basic Identity
      const athleteUrl = query(collection(db, "users"));
      const usersSnap = await getDocs(athleteUrl);
      const userDoc = usersSnap.docs.find(d => d.id === clientId);
      const baseDetail = userDoc ? { id: userDoc.id, ...userDoc.data() } : null;

      if (!baseDetail) {
        return {
          isError: true,
          content: [{ type: "text", text: `Client athlete with registration ID "${clientId}" not found.` }]
        };
      }

      // 2. Fetch Health & Metabolic Assessment Details
      const healthQ = query(collection(db, "healthAssessments"), where("clientId", "==", clientId));
      const healthSnap = await getDocs(healthQ);
      const healthDetail = healthSnap.docs.length > 0 ? { id: healthSnap.docs[0].id, ...healthSnap.docs[0].data() } : null;

      // 3. Fetch Fitness & Biometric Measurements
      const fitnessQ = query(collection(db, "fitnessAssessments"), where("clientId", "==", clientId));
      const fitnessSnap = await getDocs(fitnessQ);
      const fitnessDetail = fitnessSnap.docs.length > 0 ? { id: fitnessSnap.docs[0].id, ...fitnessSnap.docs[0].data() } : null;

      // 4. Fetch Preset Workout Schedules
      const workoutQ = query(collection(db, "workoutPlans"), where("clientId", "==", clientId));
      const workoutSnap = await getDocs(workoutQ);
      const workouts = workoutSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 5. Fetch Saved Trainer Feedback Notes
      const notesQ = query(collection(db, "trainerNotes"), where("clientId", "==", clientId));
      const notesSnap = await getDocs(notesQ);
      const feedbackNotes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              biodata: baseDetail,
              healthMetrics: healthDetail,
              vitalsAndTapeMeasurements: fitnessDetail,
              workoutRoutines: workouts,
              trainerNotes: feedbackNotes
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to compile athlete profile: ${err.message}` }]
      };
    }
  }
);

// --- TOOL 3: CREATE NEW RECRUIT RECORD ---
mcpServer.tool(
  "create_athlete",
  "Create and record a brand-new coached athlete profile in the Speed Fit roster.",
  {
    name: z.string().describe("Clear display name of the athlete."),
    email: z.string().email().describe("Primary electronic mail details."),
    phoneNumber: z.string().optional().describe("Optional contact number."),
    gender: z.enum(["male", "female", "other"]).optional().describe("Biological categorization.")
  },
  async ({ name, email, phoneNumber, gender }) => {
    try {
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        return {
          isError: true,
          content: [{ type: "text", text: `An athlete document with email "${email}" already exists.` }]
        };
      }

      const newClientRef = doc(collection(db, "users"));
      const athletePayload = {
        name,
        email: email.toLowerCase(),
        role: "CLIENT",
        status: "Active",
        phoneNumber: phoneNumber || "",
        gender: gender || "male",
        onboardingCompleted: false,
        createdAt: new Date().toISOString()
      };

      await setDoc(newClientRef, athletePayload);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Successfully recorded athlete to server roster.",
              id: newClientRef.id,
              profile: athletePayload
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to create athlete record: ${err.message}` }]
      };
    }
  }
);

// --- TOOL 4: ASSIGN PHYSICAL TRAINING WORKOUT PLAN ---
mcpServer.tool(
  "assign_workout_plan",
  "Upload or program a designated modular exercise split program for a specific athlete.",
  {
    clientId: z.string().describe("The unique registration database client ID."),
    name: z.string().describe("Name of the workout routine (e.g. EMS Strength Phase II, Core Stabilization Split)"),
    description: z.string().describe("The complete lists of dynamic movements, targeted repetitions, sets, rest lengths, metabolic goals, and posture modifiers.")
  },
  async ({ clientId, name, description }) => {
    try {
      // Confirm athlete exists
      const athleteUrl = query(collection(db, "users"));
      const usersSnap = await getDocs(athleteUrl);
      const userExists = usersSnap.docs.some(d => d.id === clientId);

      if (!userExists) {
        return {
          isError: true,
          content: [{ type: "text", text: `Workout assignment canceled. Athlete ID "${clientId}" does not exist.` }]
        };
      }

      const workoutCol = collection(db, "workoutPlans");
      const docRef = await addDoc(workoutCol, {
        clientId,
        name,
        description,
        createdAt: new Date().toISOString()
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Successfully assigned workout routine to athlete file.",
              workoutId: docRef.id,
              name,
              clientId
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to register physical workout routine: ${err.message}` }]
      };
    }
  }
);

// --- TOOL 5: RECORD MEMBERSHIP DUES / BILLING LEDGER ENTRY ---
mcpServer.tool(
  "record_payment_ledger",
  "Logs a payment history or renewal dues record into the athlete financial registry ledger.",
  {
    clientId: z.string().describe("Unique user registration document reference ID."),
    amount: z.number().describe("The premium renewal fee amount details in Indian Rupees (INR/Rs)."),
    package: z.string().describe("The active tier selection name (e.g. Premium Unlimited EMS, 12 Session Metabolic Pass)."),
    status: z.enum(["paid", "pending", "overdue"]).describe("The current payment verification status."),
    startDate: z.string().optional().describe("Cycle validation start timestamp (Format: YYYY-MM-DD)."),
    dueDate: z.string().optional().describe("Renewal threshold or due date threshold (Format: YYYY-MM-DD).")
  },
  async ({ clientId, amount, package: pkg, status, startDate, dueDate }) => {
    try {
      // Confirm athlete exists
      const athleteUrl = query(collection(db, "users"));
      const usersSnap = await getDocs(athleteUrl);
      const userExists = usersSnap.docs.some(d => d.id === clientId);

      if (!userExists) {
        return {
          isError: true,
          content: [{ type: "text", text: `Ledger execution canceled. Customer Athlete ID "${clientId}" does not match our databases.` }]
        };
      }

      const finalStartDate = startDate || new Date().toISOString().split("T")[0];
      const finalDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const refDoc = await addDoc(collection(db, "paymentRecords"), {
        clientId,
        amount,
        package: pkg,
        status,
        startDate: finalStartDate,
        dueDate: finalDueDate,
        createdAt: new Date().toISOString()
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Financial transaction ledger entry generated successfully.",
              ledgerId: refDoc.id,
              amount,
              status,
              dueDate: finalDueDate
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to record payment ledger entry: ${err.message}` }]
      };
    }
  }
);

// --- TOOL 6: APPEND TRAINER CLINICAL ASSIGNMENT FEEDBACK ---
mcpServer.tool(
  "add_trainer_feedback",
  "Record detailed clinical progression reviews, metabolic performance summaries, postural recommendations, or trainer observation comments.",
  {
    clientId: z.string().describe("The targeted registration client ID."),
    feedbackNote: z.string().describe("The athletic commenting text covering session observations and coach advice outline.")
  },
  async ({ clientId, feedbackNote }) => {
    try {
      const athleteUrl = query(collection(db, "users"));
      const usersSnap = await getDocs(athleteUrl);
      const userExists = usersSnap.docs.some(d => d.id === clientId);

      if (!userExists) {
        return {
          isError: true,
          content: [{ type: "text", text: `Add note canceled. Customer Athlete ID "${clientId}" does not exist in databases.` }]
        };
      }

      const noteRef = await addDoc(collection(db, "trainerNotes"), {
        clientId,
        note: feedbackNote,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Trainer progression comment compiled and synced with the active roster record file.",
              noteId: noteRef.id,
              clientId
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to register progression comments: ${err.message}` }]
      };
    }
  }
);


// --- SETUP EXPRESS TRANS-MAPPING FOR MODEL PROTOCOL ---
export function initMcpServer(app: express.Express) {
  console.log("Configuring Model Context Protocol (MCP) server endpoints...");

  // Endpoint 1: Initiates client stream connection (SSE Event Pipe)
  app.get("/api/mcp/sse", async (req, res) => {
    try {
      console.log(`[MCP] New connection from Claude client requested.`);
      
      const transport = new SSEServerTransport("/api/mcp/messages", res);
      const sessionId = (transport as any)._sessionId;
      activeTransports.set(sessionId, transport);

      transport.onclose = () => {
        console.log(`[MCP] Connection closed for session ${sessionId}`);
        activeTransports.delete(sessionId);
      };

      await mcpServer.connect(transport);
      console.log(`[MCP] SSE Connection initiated successfully. Session ID: ${sessionId}`);
    } catch (err) {
      console.error("[MCP] Connection error: ", err);
      if (!res.headersSent) {
        res.status(500).send("Failed to start Model Context Protocol connection.");
      }
    }
  });

  // Dynamic Bridge Script for Claude connection
  app.get("/api/mcp/bridge-script", (req, res) => {
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers.host || "localhost:3000";
    const targetUrl = `${protocol}://${host}`;
    
    const script = `/**
 * Speed Fit EMS (MCP) - Stdio to SSE Bridge for Claude Desktop
 * Generated dynamically for: ${targetUrl}
 */
const http = require('http');
const https = require('https');

const sseUrl = "${targetUrl}/api/mcp/sse";
const parsedUrl = new URL(sseUrl);
const client = parsedUrl.protocol === 'https:' ? https : http;

let postEndpoint = '';

// Establish SSE stream
const reqSse = client.request({
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
}, (res) => {
  let buffer = '';
  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        if (currentEvent === 'endpoint') {
          try {
            const resolved = new URL(data, sseUrl);
            postEndpoint = resolved.href;
          } catch(e) {
            postEndpoint = data;
          }
        } else {
          process.stdout.write(data + '\\n');
        }
      } else if (line.trim() === '') {
        currentEvent = '';
      }
    }
  });
});

reqSse.on('error', (err) => {
  console.error('[MCP Bridge Error]', err.message);
});
reqSse.end();

// Listen standard input streams
let stdioBuffer = '';
process.stdin.on('data', (chunk) => {
  stdioBuffer += chunk.toString();
  const lines = stdioBuffer.split('\\n');
  stdioBuffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      sendMsg(line.trim());
    }
  }
});

function sendMsg(payload) {
  if (!postEndpoint) {
    setTimeout(() => sendMsg(payload), 50);
    return;
  }
  const parsedPost = new URL(postEndpoint);
  const postClient = parsedPost.protocol === 'https:' ? https : http;
  
  const postReq = postClient.request({
    hostname: parsedPost.hostname,
    port: parsedPost.port || (parsedPost.protocol === 'https:' ? 443 : 80),
    path: parsedPost.pathname + parsedPost.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    res.resume();
  });
  
  postReq.on('error', (err) => {
    console.error('[MCP Post Error]', err.message);
  });
  
  postReq.write(payload);
  postReq.end();
}`;

    res.setHeader("Content-Type", "application/javascript");
    res.send(script);
  });

  // Endpoint 2: Translates messages sent by Claude to associated Session
  app.post("/api/mcp/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        return res.status(400).send("Authentication failed: Missing sessionId query parameter.");
      }

      const transport = activeTransports.get(sessionId);
      if (!transport) {
        return res.status(404).send("Model Context session expired or unrecognized.");
      }

      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error("[MCP] Message handling error: ", err);
      if (!res.headersSent) {
        res.status(500).send("Error compiling client message.");
      }
    }
  });

  console.log("[MCP] Model Context integration routes mounted successfully (GET /api/mcp/sse, POST /api/mcp/messages).");
}
