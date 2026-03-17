## Context

The bug triage tool is a greenfield web application for the santa-editor triage team. No code exists yet — only a PRD and detailed specs for six capabilities (jira-integration, code-search, triage-analysis, report-display, follow-up-chat, configuration). This change implements the complete MVP from scratch.

The application must connect to three external APIs (Jira Cloud, GitHub, Anthropic Claude) and present a real-time streaming analysis UI. The primary user flow is: enter Jira ticket key → watch AI analyze the bug → read the triage report → ask follow-up questions.

## Goals / Non-Goals

**Goals:**
- Deliver a working end-to-end bug triage tool the team can use immediately
- Stream analysis progress in real-time so users see the investigation unfold
- Keep the architecture simple — single deployable unit, minimal infrastructure
- Make it easy to iterate on individual capabilities independently

**Non-Goals:**
- Production-grade deployment (CI/CD, monitoring, alerting)
- User authentication/authorization (tool is for internal team use)
- Batch ticket processing or historical analytics
- Custom Claude prompt editing in the UI
- Mobile-responsive design

## Decisions

### D1: Monorepo with TypeScript throughout
**Decision:** Single repository with `client/` (React) and `server/` (Express) directories, sharing types via a `shared/` package. TypeScript everywhere.

**Rationale:** The team is small, the app is a single concern, and shared types between frontend and backend eliminate a class of bugs. A monorepo keeps things simple for an MVP.

**Alternatives considered:**
- Separate frontend/backend repos — unnecessary overhead for a 4-6 person team tool
- Python backend — would lose shared types and require maintaining two language toolchains

### D2: Express + SSE for streaming
**Decision:** Use Express.js for the backend API. Use Server-Sent Events (SSE) for streaming triage analysis progress to the frontend.

**Rationale:** SSE is simpler than WebSockets for this use case (server-to-client unidirectional streaming). Express is the most familiar Node.js framework and sufficient for this MVP. The Anthropic SDK natively supports streaming which maps cleanly to SSE.

**Alternatives considered:**
- WebSockets — bidirectional communication is unnecessary; SSE is simpler
- Long polling — worse UX for real-time progress updates
- tRPC — adds complexity without enough benefit for an MVP

### D3: Claude as agentic orchestrator with tools
**Decision:** Use Claude's tool-use capability to orchestrate the triage analysis. Define tools for Jira fetch, code search, and file reading. Let Claude autonomously decide which tools to call and in what order, up to a configurable limit (5-15 tool calls).

**Rationale:** This matches the existing triage-analysis spec. Claude's reasoning about which code to search and which files to read is the core value proposition. An agentic loop gives the best analysis quality.

**Alternatives considered:**
- Fixed pipeline (fetch ticket → search → analyze) — too rigid; Claude needs to iteratively explore based on what it finds
- LangChain/LangGraph — unnecessary abstraction for a single agent loop

### D4: Server-side env vars for auth, localStorage for project settings only
**Decision:** All API tokens (Jira, GitHub, Anthropic) are stored as server-side environment variables via a `.env` file. The frontend only collects the owned project and related projects, which are persisted in localStorage. Tokens never touch the browser.

**Rationale:** Simpler UX — users only need to enter what changes per-analysis (ticket + projects). Auth tokens are a one-time server setup by whoever deploys the tool. Eliminates XSS token exposure entirely.

**Alternatives considered:**
- Browser localStorage for tokens — requires every user to configure tokens, XSS risk, clutters the UI
- Per-user server-side config — unnecessary complexity for a shared internal tool

### D5: Vite for frontend tooling
**Decision:** Use Vite for frontend development and bundling. The Express server serves the built static assets in production.

**Rationale:** Vite provides fast HMR during development and efficient production builds. Single deployment unit — `npm run build` produces a `dist/` that the Express server serves alongside the API.

### D6: In-memory session store for follow-up chat
**Decision:** Store chat sessions (message history + context) in server memory, keyed by session ID. Sessions expire after 30 minutes of inactivity.

**Rationale:** Matches the follow-up-chat spec. For an MVP with a small team, in-memory storage is sufficient. No database required. Sessions are ephemeral by design.

**Alternatives considered:**
- Redis — unnecessary infrastructure for <10 concurrent users
- Client-side session storage — message history + tool results are too large

## Risks / Trade-offs

- **In-memory sessions lost on server restart** → Acceptable for MVP. Users can re-run analysis. Document this limitation.
- **API tokens require server access to configure** → Acceptable for internal tool; one-time setup by deployer. Provide a `.env.example` template.
- **Claude API costs are unbounded per analysis** → Mitigate with tool call limit (max 15 per analysis) and token budget.
- **GitHub API rate limiting (5000 req/hr authenticated)** → Sufficient for team of 4-6 doing 10-20 triage per week. Add retry with backoff.
- **No test infrastructure in MVP** → Accept for initial delivery, but structure code to be testable (dependency injection, separated concerns).
