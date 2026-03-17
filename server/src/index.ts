import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { spawn } from "child_process";
import { runTriageAnalysis, type SSEEmitter } from "./analysis.js";
import { createSession, getSession } from "./sessions.js";

// === Startup Validation ===

const REQUIRED_ENV_VARS = [
  "JIRA_MCP_SERVER_URL",
  "OCTOCODE_USER_ACCESS_KEY",
  "OCTOCODE_BASE_URL",
];

const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  console.error("Copy .env.example to .env and fill in the values.");
}

// === Express App ===

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets in production
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));

// === POST /api/triage ===

app.post("/api/triage", async (req, res) => {
  const { ticketKey, ownedRepo, relatedRepos } = req.body;

  if (!ticketKey || !ownedRepo) {
    res.status(400).json({
      error: "Missing required fields: ticketKey and ownedRepo are required",
    });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const emitter: SSEEmitter = {
    sendEvent(type: string, data: unknown) {
      const event = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
  };

  // Handle client disconnect
  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
  });

  try {
    const { report, messages } = await runTriageAnalysis(
      ticketKey,
      ownedRepo,
      relatedRepos ?? [],
      emitter,
      abortController.signal
    );

    // Create session for follow-up chat
    const sessionId = createSession(messages, ownedRepo, relatedRepos ?? []);
    emitter.sendEvent("done", { sessionId });
  } catch (err: any) {
    if (!abortController.signal.aborted) {
      emitter.sendEvent("error", { message: err.message });
    }
  } finally {
    res.end();
  }
});

// === POST /api/chat ===

app.post("/api/chat", async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    res.status(400).json({ error: "Missing sessionId or message" });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(410).json({
      error: "Session expired. Please start a new analysis.",
    });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  try {
    // Build context from previous messages for follow-up
    const context = session.messages
      .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n\n");

    const fullPrompt = `Here is the context from a previous bug triage analysis:\n\n${context}\n\nUser follow-up question: ${message}`;

    const child = spawn("claude", ["-p", fullPrompt, "--model", "sonnet"], {
      env: { ...process.env, NO_COLOR: "1" },
    });

    let output = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on("close", () => {
      session.messages.push({ role: "user", content: message });
      session.messages.push({ role: "assistant", content: output });

      const event = {
        type: "chat_response",
        data: { message: output },
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      res.end();
    });

    child.on("error", (err) => {
      const event = {
        type: "error",
        data: { message: `Claude CLI error: ${err.message}` },
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      res.end();
    });
  } catch (err: any) {
    const event = {
      type: "error",
      data: { message: err.message },
      timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
  }
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
