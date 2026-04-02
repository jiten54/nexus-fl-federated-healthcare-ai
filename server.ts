import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { spawn, ChildProcess } from "child_process";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // --- TYPES ---
  interface NodeUpdate {
    id: string;
    location: string;
    type: string;
    status: string;
    contribution: string;
    loss: string;
    anomalies: number;
    latency: string;
    coords: [number, number];
  }

  // --- REAL SYSTEM STATE (SIMULATED) ---
  let round = 1;
  let globalAccuracy = 0.72;
  let isTraining = false;
  let flProcess: ChildProcess | null = null;
  
  const nodes: NodeUpdate[] = [
    { id: "HOSPITAL-INDIA-01", location: "X-ray Hospital (India)", type: "Radiology", status: "idle", contribution: "0", loss: "0", anomalies: 0, latency: "145ms", coords: [19.0760, 72.8777] },
    { id: "HOSPITAL-USA-02", location: "ICU Hospital (USA)", type: "Critical Care", status: "idle", contribution: "0", loss: "0", anomalies: 0, latency: "42ms", coords: [44.0225, -92.4668] },
    { id: "HOSPITAL-UK-03", location: "Cardiology Center (UK)", type: "Specialized", status: "idle", contribution: "0", loss: "0", anomalies: 0, latency: "58ms", coords: [51.5074, -0.1278] },
    { id: "HOSPITAL-GERMANY-04", location: "Research Lab (Germany)", type: "Academic", status: "idle", contribution: "0", loss: "0", anomalies: 0, latency: "110ms", coords: [52.5200, 13.4050] },
  ];

  const mlOpsState = {
    experiments: [
      { id: "run_pneumonia_v1", name: "Pneumonia_CNN_Base", status: "finished", accuracy: 0.82 },
      { id: "run_pneumonia_v2", name: "Pneumonia_ResNet50_DP", status: "running", accuracy: 0.88 },
    ],
    pipelines: [
      { id: "dag_nexus_healthcare", name: "Healthcare_FL_Pipeline", status: "idle", last_run: new Date().toISOString() },
      { id: "dag_anomaly_detect", name: "Anomaly_Detection_Service", status: "success", last_run: new Date().toISOString() },
    ],
    drift_detected: false,
    privacy_budget: 1.2, // Epsilon for DP
    secure_aggregation: true,
    logs: [] as string[],
  };

  // --- TRAINING ENGINE ---
  const startTraining = () => {
    if (isTraining) return;
    
    isTraining = true;
    mlOpsState.pipelines[0].status = "running";
    const startTime = new Date().toISOString();
    mlOpsState.logs.push(`[${startTime}] 🚀 NEXUS-FL: Initializing Federated Training Pipeline...`);

    // Spawn the real Python FL launch script
    try {
      flProcess = spawn("python3", ["python/launch_fl.py"]);
      
      const runSimulation = () => {
        mlOpsState.logs.push(`[${new Date().toISOString()}] ⚠️ NEXUS-FL: Python environment not detected. Switching to High-Fidelity Simulation Mode.`);
        io.emit("mlops_log", `[${new Date().toISOString()}] ⚠️ NEXUS-FL: Python environment not detected. Switching to High-Fidelity Simulation Mode.`);
        
        const simInterval = setInterval(() => {
          if (!isTraining) {
            clearInterval(simInterval);
            return;
          }

          round++;
          globalAccuracy += Math.random() * 0.015;
          if (globalAccuracy > 0.94) globalAccuracy = 0.94 - (Math.random() * 0.05); // Simulate some noise/drift

          // Privacy Budget increases with each round
          mlOpsState.privacy_budget += 0.05;

          // Randomly trigger drift
          if (round > 10 && Math.random() > 0.8) {
            mlOpsState.drift_detected = true;
            mlOpsState.logs.push(`[${new Date().toISOString()}] 🚨 ALERT: Model Drift Detected! Global accuracy dropping.`);
            io.emit("mlops_log", `[${new Date().toISOString()}] 🚨 ALERT: Model Drift Detected! Global accuracy dropping.`);
          } else if (mlOpsState.drift_detected && Math.random() > 0.7) {
            mlOpsState.drift_detected = false;
            mlOpsState.logs.push(`[${new Date().toISOString()}] ✅ RESOLVED: Model Drift corrected via re-weighting.`);
            io.emit("mlops_log", `[${new Date().toISOString()}] ✅ RESOLVED: Model Drift corrected via re-weighting.`);
          }

          const logEntry = `[${new Date().toISOString()}] METRIC: round=${round}, accuracy=${globalAccuracy.toFixed(4)}, loss=${(0.4 / round).toFixed(4)}, epsilon=${mlOpsState.privacy_budget.toFixed(2)}`;
          mlOpsState.logs.push(logEntry);
          io.emit("mlops_log", logEntry);

          nodes.forEach(node => {
            if (node.status === 'removed') return;

            node.status = "training";
            node.loss = (Math.random() * 0.08 + 0.02).toFixed(4);
            node.contribution = (Math.random() * 4 + 6).toFixed(2);
            
            // Randomly trigger anomalies for specific nodes
            if (node.id === "HOSPITAL-GERMANY-04" && Math.random() > 0.7) {
              node.anomalies++;
              mlOpsState.logs.push(`[${new Date().toISOString()}] ⚠️ ANOMALY: High variance gradients from ${node.id}`);
              io.emit("mlops_log", `[${new Date().toISOString()}] ⚠️ ANOMALY: High variance gradients from ${node.id}`);
            }

            // Self-Healing: Remove node if too many anomalies
            if (node.anomalies > 5) {
              node.status = "removed";
              mlOpsState.logs.push(`[${new Date().toISOString()}] 🛡️ SELF-HEALING: Node ${node.id} quarantined due to data quality issues.`);
              io.emit("mlops_log", `[${new Date().toISOString()}] 🛡️ SELF-HEALING: Node ${node.id} quarantined due to data quality issues.`);
            }
          });

          io.emit("federated_update", { 
            round, 
            globalAccuracy, 
            nodes, 
            timestamp: new Date().toISOString(),
            drift_detected: mlOpsState.drift_detected 
          });

          if (round % 5 === 0) {
            mlOpsState.logs.push(`[${new Date().toISOString()}] 🔄 NEXUS-FL: Global aggregation complete for Round ${round}`);
          }
        }, 3000);
      };

      flProcess.on("error", (err) => {
        console.error("Failed to start Python process, falling back to simulation:", err);
        runSimulation();
      });

      flProcess.stdout?.on("data", (data) => {
        const message = data.toString().trim();
        if (message) {
          const logEntry = `[${new Date().toISOString()}] ${message}`;
          mlOpsState.logs.push(logEntry);
          io.emit("mlops_log", logEntry);
          
          // Parse structured logs
          if (message.includes("METRIC:")) {
            const parts = message.split("METRIC:")[1].trim().split(",");
            parts.forEach(p => {
              const [key, val] = p.trim().split("=");
              if (key === "round") round = parseInt(val);
              if (key === "accuracy") globalAccuracy = parseFloat(val);
            });
            io.emit("federated_update", { round, globalAccuracy, nodes, timestamp: new Date().toISOString() });
          }

          if (message.includes("NODE_UPDATE:")) {
            const parts = message.split("NODE_UPDATE:")[1].trim().split(",");
            const update: any = {};
            parts.forEach(p => {
              const [key, val] = p.trim().split("=");
              update[key] = val;
            });

            const nodeIndex = nodes.findIndex(n => n.id.toLowerCase().includes(update.id.toLowerCase()));
            if (nodeIndex !== -1) {
              if (update.status) nodes[nodeIndex].status = update.status;
              if (update.loss) nodes[nodeIndex].loss = update.loss;
              if (update.contribution) nodes[nodeIndex].contribution = update.contribution;
              io.emit("federated_update", { round, globalAccuracy, nodes, timestamp: new Date().toISOString() });
            }
          }
        }
      });

      flProcess.stderr?.on("data", (data) => {
        const errorMsg = `[${new Date().toISOString()}] ERROR: ${data.toString().trim()}`;
        mlOpsState.logs.push(errorMsg);
        io.emit("mlops_log", errorMsg);
      });

      flProcess.on("close", (code) => {
        isTraining = false;
        mlOpsState.pipelines[0].status = "idle";
        mlOpsState.logs.push(`[${new Date().toISOString()}] 🛑 NEXUS-FL: Training process exited with code ${code}`);
        io.emit("training_stopped", { code });
      });

    } catch (err) {
      console.error("Failed to start FL process:", err);
      isTraining = false;
    }
  };

  const stopTraining = () => {
    if (flProcess) {
      flProcess.kill();
      flProcess = null;
    }
    isTraining = false;
    mlOpsState.pipelines[0].status = "idle";
    mlOpsState.logs.push(`[${new Date().toISOString()}] 🛑 NEXUS-FL: Training stopped by operator`);
  };

  // --- REAL SYSTEM APIS ---
  app.get("/api/nodes", (req, res) => res.json(nodes));
  
  app.get("/api/metrics", (req, res) => {
    res.json({
      round,
      globalAccuracy,
      avgLoss: nodes.reduce((acc, n) => acc + parseFloat(n.loss), 0) / nodes.length,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/anomalies", (req, res) => {
    const anomalies = nodes.filter(n => n.anomalies > 0);
    res.json(anomalies);
  });

  app.post("/api/train/start", (req, res) => {
    if (isTraining) return res.status(400).json({ error: "Training already in progress" });
    startTraining();
    res.json({ status: "Training started", round });
  });

  app.post("/api/train/stop", (req, res) => {
    stopTraining();
    res.json({ status: "Training stopped" });
  });

  // Start training on boot as requested
  startTraining();

  app.get("/api/mlops/status", (req, res) => res.json(mlOpsState));

  // --- AI INTELLIGENCE (RAG SIMULATION) ---
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      const systemInstruction = `You are NEXUS Intelligence, the AI Analyst for a Federated Healthcare Intelligence System (NEXUS-FL).
      Your goal is to analyze the current state of a distributed training network for Pneumonia Detection from Chest X-rays.
      
      CURRENT NETWORK STATE:
      - Round: ${round}
      - Global Accuracy: ${globalAccuracy.toFixed(4)}
      - Privacy Budget (Epsilon): ${mlOpsState.privacy_budget.toFixed(2)}
      - Secure Aggregation: ${mlOpsState.secure_aggregation ? "ENABLED" : "DISABLED"}
      - Nodes: ${JSON.stringify(nodes)}
      - Drift Detected: ${mlOpsState.drift_detected}
      - Recent Logs: ${mlOpsState.logs.slice(-5).join("\n")}
      
      INSIGHTS TO PROVIDE:
      - Explain model performance (e.g., "Accuracy improving due to strong contribution from India node").
      - Detect data quality issues (e.g., "Hospital Germany shows noisy X-ray data -> possible low-quality scans").
      - Comment on privacy (e.g., "No patient data shared; Federated learning ensures privacy; Differential privacy applied").
      - Analyze anomalies and drift (e.g., "No drift detected in pneumonia patterns").
      - Provide confidence scores for the current global model.
      
      Keep responses concise, technical, and professional. Use markdown.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { systemInstruction, maxOutputTokens: 1000 },
      });

      res.json({ text: result.text });
    } catch (error) {
      res.status(500).json({ error: "Intelligence Network Offline" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXUS-FL Server running on http://localhost:${PORT}`);
  });
}

startServer();
