// === API Request/Response Types ===

export interface TriageRequest {
  ticketKey: string;
  ownedRepo: string;
  relatedRepos: string[];
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

// === Triage Report Types ===

export interface TriageReport {
  ticketKey: string;
  ticketSummary: string;
  confidence: number;
  isOwnedByTeam: boolean;
  owningTeam: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
  relatedFiles: RelatedFile[];
  suggestedTeam: string | null;
  analysis: string;
}

export interface RelatedFile {
  path: string;
  repo: string;
  relevance: string;
  url: string;
}

// === SSE Event Types ===

export type SSEEventType =
  | "status"
  | "tool_call"
  | "tool_result"
  | "report"
  | "error"
  | "done";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

export interface StatusEvent {
  type: "status";
  data: { message: string };
}

export interface ToolCallEvent {
  type: "tool_call";
  data: { tool: string; input: Record<string, unknown> };
}

export interface ToolResultEvent {
  type: "tool_result";
  data: { tool: string; summary: string };
}

export interface ReportEvent {
  type: "report";
  data: TriageReport;
}

export interface ErrorEvent {
  type: "error";
  data: { message: string };
}

export interface DoneEvent {
  type: "done";
  data: { sessionId: string };
}

// === Jira Types ===

export interface JiraTicket {
  key: string;
  summary: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string[];
  components: string[];
  assignee: string | null;
  comments: JiraComment[];
}

export interface JiraComment {
  author: string;
  body: string;
  created: string;
}

// === GitHub Types ===

export interface CodeSearchResult {
  path: string;
  repo: string;
  url: string;
  snippet: string;
}

export interface FileContent {
  path: string;
  repo: string;
  content: string;
  url: string;
}
