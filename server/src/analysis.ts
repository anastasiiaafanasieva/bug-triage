import { spawn, type ChildProcess } from "child_process";
import type { TriageReport } from "../../shared/src/index.js";

// === SSE Emitter Type ===

export interface SSEEmitter {
  sendEvent(type: string, data: unknown): void;
}

// === Build the prompt for Claude CLI ===

function buildPrompt(
  ticketKey: string,
  ownedRepo: string,
  relatedRepos: string[]
): string {
  return `You are a bug triage analyst. Analyze Jira ticket ${ticketKey} and determine which team/repository owns the issue.

The user's team owns: ${ownedRepo}
Related repositories to investigate: ${relatedRepos.join(", ") || "none specified"}

Your process:
1. First, fetch the Jira ticket to understand the bug (use the Jira MCP tools)
2. Search for relevant code across the owned and related repositories (use the Octocode MCP tools)
3. Read specific files to understand code ownership and architecture
4. Determine ownership based on where the bug's root cause likely lives

After your investigation, output your final analysis in this exact JSON format (and nothing else after it):

\`\`\`json
{
  "ticketSummary": "Brief summary of the bug",
  "confidence": <0-100>,
  "isOwnedByTeam": <true/false>,
  "owningTeam": "Team/repo that owns this bug",
  "argumentsFor": ["reason 1 why it belongs to the team", ...],
  "argumentsAgainst": ["reason 1 why it might not belong", ...],
  "relatedFiles": [{"path": "file/path.ts", "repo": "owner/repo", "relevance": "why this file matters"}],
  "suggestedTeam": "other-team/repo or null if owned by team",
  "analysis": "Detailed explanation of your reasoning"
}
\`\`\`

Be thorough but efficient. Focus on finding evidence.`;
}

// === Build MCP config for Claude CLI ===

function buildMcpConfig(): object {
  const config: Record<string, any> = {};

  const jiraUrl = process.env.JIRA_MCP_SERVER_URL;
  if (jiraUrl) {
    config.jira = {
      type: "url",
      url: jiraUrl,
    };
  }

  const accessKey = process.env.OCTOCODE_USER_ACCESS_KEY;
  const baseUrl = process.env.OCTOCODE_BASE_URL;
  if (accessKey && baseUrl) {
    config.octocode = {
      command: "npx",
      args: ["-y", "@mcp-s/mcp"],
      env: {
        USER_ACCESS_KEY: accessKey,
        BASE_URL: baseUrl,
        MCP: "octocode",
      },
    };
  }

  return { mcpServers: config };
}

// === Analysis timeout (3 minutes) ===
const ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;

// === Agentic Analysis via Claude CLI ===

export async function runTriageAnalysis(
  ticketKey: string,
  ownedRepo: string,
  relatedRepos: string[],
  emitter: SSEEmitter,
  signal?: AbortSignal
): Promise<{ report: TriageReport; messages: Array<{ role: string; content: string }> }> {
  const prompt = buildPrompt(ticketKey, ownedRepo, relatedRepos);
  const mcpConfig = buildMcpConfig();
  const mcpConfigStr = JSON.stringify(mcpConfig);

  console.log("[analysis] Starting claude CLI...");
  console.log("[analysis] MCP config:", JSON.stringify(mcpConfig, null, 2));

  emitter.sendEvent("status", { message: "Starting analysis via Claude..." });

  return new Promise((resolve, reject) => {
    const args = [
      "-p", prompt,
      "--output-format", "stream-json",
      "--mcp-config", mcpConfigStr,
      "--allowedTools", "mcp__jira:*,mcp__octocode:*",
      "--model", "sonnet",
      "--max-turns", "15",
    ];

    console.log("[analysis] Command: claude", args.map(a => a.length > 100 ? a.slice(0, 100) + "..." : a).join(" "));

    const child: ChildProcess = spawn("claude", args, {
      env: { ...process.env, NO_COLOR: "1" },
    });

    // Timeout
    const timeout = setTimeout(() => {
      console.error("[analysis] Timeout after", ANALYSIS_TIMEOUT_MS / 1000, "seconds");
      emitter.sendEvent("error", { message: "Analysis timed out after 3 minutes. The Claude CLI may be stuck." });
      child.kill("SIGTERM");
    }, ANALYSIS_TIMEOUT_MS);

    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        child.kill("SIGTERM");
      });
    }

    let fullOutput = "";
    let stderrOutput = "";
    let lastToolName = "";
    let gotAnyOutput = false;

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      gotAnyOutput = true;
      console.log("[analysis:stdout]", text.slice(0, 200));

      const lines = text.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          if (event.type === "assistant" && event.subtype === "tool_use") {
            lastToolName = event.tool_name ?? "unknown";
            emitter.sendEvent("tool_call", {
              tool: lastToolName,
              input: event.input ?? {},
            });
          } else if (event.type === "result" && event.subtype === "tool_result") {
            emitter.sendEvent("tool_result", {
              tool: lastToolName,
              summary: "Done",
            });
          } else if (event.type === "assistant" && event.subtype === "text") {
            fullOutput += event.text ?? "";
            // Show partial text in the log
            const snippet = (event.text ?? "").slice(0, 100);
            if (snippet) {
              emitter.sendEvent("status", { message: `Claude: ${snippet}...` });
            }
          } else if (event.type === "result") {
            fullOutput = event.result ?? fullOutput;
          } else {
            // Log any other event types for debugging
            console.log("[analysis:event]", event.type, event.subtype ?? "");
            emitter.sendEvent("status", { message: `[${event.type}${event.subtype ? ":" + event.subtype : ""}]` });
          }
        } catch {
          // Not JSON — accumulate as raw text
          fullOutput += line;
        }
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        stderrOutput += text + "\n";
        console.error("[analysis:stderr]", text);
        // Show stderr in the UI as a warning
        emitter.sendEvent("status", { message: `⚠ ${text}` });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[analysis] spawn error:", err.message);
      reject(new Error(`Failed to start claude CLI: ${err.message}. Is 'claude' installed and in PATH?`));
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      console.log("[analysis] claude exited with code", code);
      console.log("[analysis] got output:", fullOutput.length, "chars");
      if (stderrOutput) console.log("[analysis] stderr:", stderrOutput);

      if (signal?.aborted) {
        reject(new Error("Analysis aborted"));
        return;
      }

      // If claude exited with an error and no useful output
      if (code !== 0 && !fullOutput) {
        const errMsg = stderrOutput || `Claude CLI exited with code ${code}`;
        reject(new Error(errMsg));
        return;
      }

      // If we got no output at all
      if (!gotAnyOutput) {
        reject(new Error(
          "Claude CLI produced no output. Check server logs for details." +
          (stderrOutput ? ` stderr: ${stderrOutput.slice(0, 200)}` : "")
        ));
        return;
      }

      const report = parseReport(ticketKey, fullOutput);
      emitter.sendEvent("report", report);

      const messages = [
        { role: "user", content: prompt },
        { role: "assistant", content: fullOutput },
      ];

      resolve({ report, messages });
    });
  });
}

// === Report Parsing ===

function parseReport(ticketKey: string, text: string): TriageReport {
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)\s*```/) ||
    text.match(/\{[\s\S]*"confidence"[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
      return {
        ticketKey,
        ticketSummary: raw.ticketSummary ?? "",
        confidence: Math.max(0, Math.min(100, raw.confidence ?? 50)),
        isOwnedByTeam: raw.isOwnedByTeam ?? false,
        owningTeam: raw.owningTeam ?? "Unknown",
        argumentsFor: raw.argumentsFor ?? [],
        argumentsAgainst: raw.argumentsAgainst ?? [],
        relatedFiles: (raw.relatedFiles ?? []).map((f: any) => ({
          path: f.path ?? "",
          repo: f.repo ?? "",
          relevance: f.relevance ?? "",
          url:
            f.url ?? `https://github.com/${f.repo}/blob/main/${f.path}`,
        })),
        suggestedTeam: raw.suggestedTeam ?? null,
        analysis: raw.analysis ?? text,
      };
    } catch {
      // Fall through to fallback
    }
  }

  return {
    ticketKey,
    ticketSummary: "",
    confidence: 50,
    isOwnedByTeam: false,
    owningTeam: "Unknown",
    argumentsFor: [],
    argumentsAgainst: [],
    relatedFiles: [],
    suggestedTeam: null,
    analysis: text,
  };
}
