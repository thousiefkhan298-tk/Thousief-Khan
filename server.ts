import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initMcpServer } from "./src/mcpServer.js";

// Firebase applet configuration (project id + named Firestore database id)
let appletConfig: any = {};
try {
  appletConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
} catch (e: any) {
  console.warn("Could not read firebase-applet-config.json:", e.message);
}
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || appletConfig.projectId;
const FIRESTORE_DATABASE_ID = appletConfig.firestoreDatabaseId;

if (!FIRESTORE_DATABASE_ID) {
  console.error("CONFIG ERROR: firestoreDatabaseId is missing from firebase-applet-config.json. The backend would fall back to the (default) database, which does not exist in this project.");
}

// Initialize Firebase Admin securely
try {
  if (FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: FIREBASE_PROJECT_ID,
    });
    console.log("Firebase Admin initialized for project " + FIREBASE_PROJECT_ID + " (database: " + (FIRESTORE_DATABASE_ID || "(default)") + ").");
  } else {
    admin.initializeApp();
    console.log("Firebase Admin initialized with default configuration.");
  }
} catch (e: any) {
  console.warn("Firebase Admin already initialized or could not be initialized:", e.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Add JSON parser middleware with a safe size limit
  app.use(express.json({ limit: "20mb" }));

  console.log(`Starting server on port ${PORT}...`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

  // Root health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure database check endpoint using firebase-admin to satisfy requirements
  app.get("/api/admin/db-check", async (req, res) => {
    try {
      const dbAdmin = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);
      const usersSnap = await dbAdmin.collection("users").limit(1).get();
      res.json({
        success: true,
        message: "Firebase Admin is fully configured and connected to Firestore.",
        usersFound: !usersSnap.empty
      });
    } catch (err: any) {
      console.warn("Firebase Admin check failed, falling back gracefully:", err.message);
      res.json({
        success: false,
        message: "Firebase Admin configuration check failed, but fallback is handled: " + err.message,
        usersFound: false
      });
    }
  });

  // Initialize Model Context Protocol (MCP) server endpoints
  initMcpServer(app);

  // SPEED FIT TRANSFORMATION ENGINE GENERATION ROUTE
  app.post("/api/transformation/generate", async (req, res) => {
    try {
      const clientData = req.body;
      if (!clientData || !clientData.name) {
        return res.status(400).json({ error: "Client basic information (name) is required." });
      }

      console.log(`Generating Transformation draft for client: ${clientData.name}`);

      // Compose the internal coach prompt with rigorous fitness guidelines
      const userPrompt = `
Analyze the following client input parameters and generate a highly custom fitness blueprint.

CLIENT DETAILS:
- Name: ${clientData.name}
- Age: ${clientData.age || "Not specified"} years old
- Gender: ${clientData.gender || "Not specified"}
- Height: ${clientData.height || "Not specified"} cm
- Weight: ${clientData.weight || "Not specified"} kg
- Goals: ${clientData.goals ? clientData.goals.join(", ") : "General Fitness"}
- Occupation: ${clientData.occupation || "Office Worker"}
- Lifestyle:
  * Sleep Hours: ${clientData.sleepHours || "Not specified"}
  * Stress Level: ${clientData.stressLevel || "Medium"}
  * Water Intake: ${clientData.waterIntake || "Not specified"} liters
  * Activity Level: ${clientData.activityLevel || "Not specified"}
- Food Preferences: ${clientData.foodPreference || "Non-Vegetarian"}
- Habits: ${clientData.habits ? clientData.habits.join(", ") : "None"}
- Medical Conditions: ${clientData.medicalConditions ? clientData.medicalConditions.join(", ") : "None"}
- Equipment Access: ${clientData.equipmentAccess || "Full Gym"}

---------------------------------------------------------
YOUR ROLE & VOICE:
You are the internal AI Transformation Coach for Speed Fit.
- You are writing this as a draft proposal for certified fitness coach review only.
- Speak in a highly technical, objective, and coaching-oriented perspective.
- You are NOT a chatbot. You must NEVER speak directly to the client.
- NEVER mention "AI", "Gemini", "LLM", "machine learning", or automation.
- Every section is designed to be validated by human trainers.
- Ensure all meal recommendations consist of practical foods widely available in India (e.g., paneer, chicken breast, eggs, dal, roti, rice, whey, oats, dahi).

CORE LOGICS TO IMPLEMENT:
1. Occupation Adaptations:
   - Students: Focus on budget-friendly protein sources (eggs, soy chunks, dal, low-fat paneer).
   - Night Shift: Structurize meal timings around their shift hours. Suggest caffeine cutoffs and sleep support routines.
   - Business Owners: Focus on quick-preparation meal logic (shakes, meal prep tips).
   - Actors/Models: Highly lean physique target, focus on low caloric density, high satiety foods.
   - Office Workers: Address the desk-job lifestyle, incorporate standing/walking triggers and neat targets.
2. Habits & Medical logic:
   - For Smokers: Hydration protocols and recovery/walking targets are emphasized.
   - For Alcohol Users: Focus on critical dehydration avoidance, protein retention, and high electrolyte levels.
   - Medical conditions (like diabetes, hypertension, knee/back pain): Generate specific trainer precautions (e.g., avoid direct spinal loading if back pain; modify squats if knee pain; control carb intake for diabetes). Keep risk ratings matching (High/Medium/Low).
3. Workout program:
   - Create a modular Week 1-4 workout routine. Customize sets, reps, and rest times based on their goal and experience. Include Warmup, Main workout, Cardio, Cool Down.

OUTPUT REQUIREMENT:
You must return a valid JSON object matching the exact specification below. Do not include any HTML formatting, markdown blocks like \`\`\`json, or outer texts. Only return pure JSON.

SCHEMA SPECIFICATION:
{
  "transformationReport": {
    "currentCondition": "Description of current body assessment and nutritional status.",
    "strengths": ["list of client clinical strengths or advantages"],
    "weaknesses": ["list of potential limitations, weak muscle groups, or hurdles"],
    "postureFindings": "Detailed findings about posture (e.g. forward head, rounded shoulders, pelvic tilt or normal).",
    "lifestyleFindings": "Evaluation of sleep, hydration, and occupational stressors.",
    "nutritionFindings": "Assessment of current diet and nutritional status.",
    "potential": "Coaching evaluation of overall transformation capability.",
    "timeline": {
      "type": "Fat Loss / Muscle Gain / Recomposition",
      "duration": "Estimated timeline (e.g. 12-16 weeks)",
      "milestones": [
        { "week": "Milestone week marker (e.g., Week 4)", "milestone": "Target expectation" }
      ]
    }
  },
  "dietPlan": {
    "calories": Number,
    "protein": Number,
    "carbs": Number,
    "fats": Number,
    "meals": {
      "breakfast": { "content": "Breakfast instructions.", "alternatives": "Alternative choices." },
      "lunch": { "content": "Lunch instructions.", "alternatives": "Alternative choices." },
      "dinner": { "content": "Dinner instructions.", "alternatives": "Alternative choices." },
      "snacks": { "content": "Snacks instructions.", "alternatives": "Alternative choices." }
    }
  },
  "workoutPlan": {
    "sections": [
      { "title": "Warmup Protocol", "content": "Sets, reps, dynamic stretching routines..." },
      { "title": "Resistance Routine (Week 1-4)", "content": "Sets, reps, exercises targeted at goals..." },
      { "title": "Cardio Prescription", "content": "Minutes, intensity, type..." },
      { "title": "Cool Down Recovery", "content": "Static stretching routines..." }
    ]
  },
  "postureAssessment": {
    "postureScore": Number (0-100),
    "mobilityScore": Number (0-100),
    "findings": [
      { "issue": "Specific posture concern (e.g. Rounded Shoulders)", "severity": "Low/Medium/High", "rehabExercises": ["Recommended rehabilitation movements"] }
    ]
  },
  "lifestylePlan": {
    "sleepStrategy": "Strategies to optimize recovery sleep.",
    "stressManagement": "Tactics for neurological stress reduction.",
    "hydrationPlan": "Optimal daily water intake guide."
  },
  "supplementRecommendations": {
    "items": [
      { "name": "Allowed Supplement (e.g., Whey Protein, Fish Oil, Multivitamin)", "dosage": "Recommended dosage", "purpose": "Scientific explanation of benefits" }
    ]
  },
  "riskAssessment": {
    "riskLevel": "Low / Medium / High",
    "identifiedHazards": ["list of hazards based on health and conditions"],
    "precautions": ["Precautions for the trainer to enforce"]
  },
  "weeklyActionPlan": {
    "walkingGoal": "Specific step targets",
    "targets": [
      { "day": "Day marker", "task": "A specific checklist task" }
    ]
  },
  "pdfSections": {
    "intro": "Formatted text for Speed Fit Transformation Assessment intro block.",
    "bodyAnalysis": "Formatted summary of Body Analysis review for PDF output.",
    "postureReport": "Formatted text detailing the Posture Report.",
    "nutritionGuide": "Structured, readable description of Diet Plan suitable for PDF.",
    "workoutBlueprint": "Structured, readable description of Workout Plan suitable for PDF.",
    "supplementGuide": "Detailed, styled supplement instructions for PDF.",
    "lifestyleAndHabits": "Habit management and recovery tips formatted for PDF.",
    "weeklyAction": "Styled checklist of weekly targets for PDF.",
    "coachReviewNotes": "Important technical notes for the reviewing trainer for PDF."
  }
}
      `;

      // Define system instruction setting rules as internal AI Coach
      const systemInstruction = `
You are the internal AI Transformation Coach for Speed Fit.
You only output structured JSON for coach review.
You NEVER speak directly to client.
You NEVER use words like "AI", "Gemini", "LLM", "machine learning", or automation.
Keep recommendations realistic, specific, and tailored. Avoid any trailing outer text.
      `;

      // Call Gemini API in server-side wrapper
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        data: parsedData
      });

    } catch (err: any) {
      console.error("Error generating transformation plan draft:", err);
      res.status(500).json({ error: "Failed to generate AI transformation draft: " + err.message });
    }
  });

  // HISTORICAL METRICS GEMINI-POWERED COGNITIVE SUMMARY ROUTE
  app.post("/api/transformation/summarize-metrics", async (req, res) => {
    try {
      const { clientInfo, weightTrends, strengthLogs, compliance } = req.body;
      if (!clientInfo || !clientInfo.name) {
        return res.status(400).json({ error: "Client basic information (name) is required." });
      }

      console.log(`Generating cognitive analytics summary for client: ${clientInfo.name}`);

      const userPrompt = `
Analyze the following client metrics and provide a comprehensive, elite coaching transformation report with clear developmental suggestions.

CLIENT METRICS DATA:
- Basic Detail: ${clientInfo.age || 'N/A'}yo ${clientInfo.gender || 'N/A'}, ${clientInfo.height || 'N/A'}cm, Current weight ${clientInfo.weight || 'N/A'}kg
- Fitness Goals: ${clientInfo.goals ? clientInfo.goals.join(", ") : "General Transformation"}
- Historical weight trends logged:
${JSON.stringify(weightTrends || [], null, 2)}
- Strength/Resistance progression logs (Max weight lifted per exercise):
${JSON.stringify(strengthLogs || [], null, 2)}
- Accountability & Compliance metrics:
  * Class Attendance Rate: ${compliance?.attendanceRate || '0'}% (${compliance?.totalPresent || 0} Present / ${compliance?.totalMissed || 0} Missed classes)
  * Total Workout Sessions Saved in Tracker: ${compliance?.workoutLogsCount || 0} logs

Your task is to write a highly professional, clinical, data-driven synthesis of this specific cohort of metrics.
- Speak in the objective tone of a Certified Speed Fit Elite Coach.
- Do NOT use terms like "AI", "Gemini", "Large Language Model", or automated tags.
- Provide practical recommendations: if weight trends are stalling, adjust caloric inputs; if strength gains show progressive overload, praise specific exercises; if compliance is low, provide a friendly strategy to improve.

Only return a valid JSON object matching this exact schema:
{
  "summary": "High-level diagnostic synthesis summarizing overall progress and elite motivation (max 150 words).",
  "weightAnalysis": "Coaching analysis of body weight trends over time, validating progress toward their goal range (max 100 words).",
  "strengthMilestones": "Analysis of muscular strength development/progressive overload and joint adaptation (max 120 words).",
  "complianceDiagnosis": "Deep diagnostic analysis of class attendance and consistency, detailing accountability improvements (max 100 words).",
  "actionSteps": [
    "A precise daily task or habit change tailored specifically to their goals and metrics.",
    "A progressive training progression or recovery adaptation.",
    "A specific nutrition, sleep, or hydration calibration target."
  ]
}
`;

      const systemInstruction = "You are the Head Coaching Analyst for Speed Fit. You only output structured JSON for client metric summaries. Absolutely no markdown, trailing text or outer comments.";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        data: parsedData
      });

    } catch (err: any) {
      console.error("Error generating metrics transformation summary:", err);
      res.status(500).json({ error: "Failed to generate metrics transformation summary: " + err.message });
    }
  });

  // BODY POSTURE DETECTION ROUTE VIA MULTIMODAL GEMINI EYE
  app.post("/api/posture/analyze", async (req, res) => {
    try {
      const { imageUrl, base64Image, mimeType } = req.body;
      
      let finalBase64 = "";
      let finalMimeType = mimeType || "image/jpeg";

      if (base64Image) {
        finalBase64 = base64Image;
      } else if (imageUrl) {
        console.log(`Downloading progress image for posture analysis: ${imageUrl}`);
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
          throw new Error(`Failed to download image from storage: ${imageRes.statusText}`);
        }
        const buffer = await imageRes.arrayBuffer();
        finalBase64 = Buffer.from(buffer).toString("base64");
        
        // Try to get correct mime type
        const resMime = imageRes.headers.get("content-type");
        if (resMime) {
          finalMimeType = resMime;
        }
      } else {
        return res.status(400).json({ error: "No imageUrl or base64Image provided." });
      }

      console.log(`Analyzing posture using gemini-3.5-flash...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: finalMimeType,
              data: finalBase64,
            },
          },
          {
            text: `You are the Speed Fit Orthopedic AI Posture Specialist.
Analyze the posture of the person in this physique progress photo.
Look closely for structural body alignment issues, such as:
1. Forward Head Posture / Tech Neck
2. Rounded Shoulders (Kyphosis)
3. Anterior / Posterior Pelvic Tilt (hip alignment)
4. Uneven shoulders or hips
5. Lateral head or spine tilts

Provide a realistic posture score from 0 to 100 (where 100 is pristine alignment) and mobility score from 0 to 100.
Also identify any major findings, their severity (Low, Medium, High), and specify 2-3 standard rehabilitation movements/exercises to correct them.

You MUST respond in pure JSON matching the following structure EXACTLY. No markdown blocks, no formatting text.

{
  "postureScore": 85,
  "mobilityScore": 80,
  "summary": "Overall posture alignment summary.",
  "findings": [
    {
      "issue": "Name of the issue (e.g., Forward Head)",
      "severity": "Low / Medium / High",
      "rehabExercises": ["Name & description of rehabilitation exercise 1", "Exercise 2"]
    }
  ]
}`
          }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        data: parsedData
      });

    } catch (error: any) {
      console.error("Error in posture analysis endpoint:", error);
      res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred during posture analysis."
      });
    }
  });

  // AI COACH INTERACTION CHAT ROUTE
  app.post("/api/ai-coach/chat", async (req, res) => {
    try {
      const { message, clientContext, chatHistory } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      console.log(`AI Coach Chat processing message from client or trainer...`);

      const formattedHistory = (chatHistory || []).map((msg: any) => {
        return `${msg.sender === 'user' ? 'Client/Trainer' : 'AI Coach'}: ${msg.text}`;
      }).join("\n");

      const systemInstruction = `You are the Speed Fit Elite AI Coach, a world-class certified fitness, nutrition, and lifestyle transformation specialist.
Your style is inspired by Nike Training Club, Whoop, Apple Fitness+, and high-end luxury coaching portals.
You are technical, elite, scientific, yet encouraging and motivational. You speak with high-end premium clarity.
You NEVER speak like a generic LLM chatbot. NEVER say "I am an AI", "As an artificial intelligence", or reference Gemini.
You have access to the client's current context below. You must understand this context automatically without asking them to repeat it.

CLIENT CONTEXT:
${JSON.stringify(clientContext || {}, null, 2)}

-------------------------
GUIDELINES:
1. Address the user's questions specifically and scientifically.
2. Formulate practical advice: adjust caloric/protein/water intake, modify training, outline active recovery strategies, progressive overload guidelines, sleep optimizations, or stress management tools.
3. Be direct, crisp, and clean. Use beautiful markdown with neat bullet points for layout where appropriate. Keep it highly readable with spacious, bold formatting.
4. If a client is asking for workouts or diets, you can outline highly optimized schedules featuring Indian food suggestions or targeted routines.
`;

      const prompt = `
CHAT HISTORY:
${formattedHistory}

Current User Message: ${message}

Response:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      });

      res.json({
        success: true,
        reply: response.text || ""
      });

    } catch (error: any) {
      console.error("Error in AI Coach Chat endpoint:", error);
      res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred during AI Coach chat."
      });
    }
  });

  const distPath = path.resolve(__dirname, "dist");

  if (process.env.NODE_ENV === "production") {
    console.log(`Serving static from ${distPath}`);
    app.use(express.static(distPath));

    // Handle all other requests by serving index.html
    app.get('*all', (req, res) => {
      // If it's an API request that reached here, it's a 404
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      
      // If it's a file request that wasn't caught by express.static, it's a 404
      if (req.path.includes('.')) {
        return res.status(404).end();
      }

      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application shell not found");
      }
    });
  } else {
    console.log("Vite dev server starting");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
