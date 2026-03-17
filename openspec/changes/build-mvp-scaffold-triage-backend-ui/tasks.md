## 1. Project Scaffold

- [x] 1.1 Initialize root package.json with workspaces for client/, server/, shared/
- [x] 1.2 Set up shared/ package with TypeScript types (API request/response types, SSE event types, triage report types)
- [x] 1.3 Set up server/ package with Express, TypeScript, dotenv, and tsconfig extending shared types
- [x] 1.4 Set up client/ package with Vite + React + TypeScript, configure API proxy to port 3000
- [x] 1.5 Create root-level dev script (concurrently runs client and server), build script, and start script
- [x] 1.6 Add root tsconfig.json with strict mode, ESLint config, .gitignore, and .env.example with required env vars (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, GITHUB_TOKEN, ANTHROPIC_API_KEY)

## 2. Backend — Jira Integration

- [x] 2.1 Create Jira API client module: read credentials from env vars, fetch ticket details (summary, description, status, priority, labels, components, assignee)
- [x] 2.2 Add Jira comments fetching to the client module
- [x] 2.3 Add error handling for invalid tickets (404) and auth failures (401)

## 3. Backend — GitHub Code Search

- [x] 3.1 Create GitHub API client module using Octokit: read token from env var, code search across repositories by keywords
- [x] 3.2 Add file content reading endpoint (fetch specific file from a repo)
- [x] 3.3 Add rate limit handling with exponential backoff (up to 3 retries)

## 4. Backend — Claude Agentic Analysis

- [x] 4.1 Define Claude tool schemas for Jira fetch, code search, and file read
- [x] 4.2 Implement the agentic analysis loop using Anthropic SDK with streaming — system prompt with triage instructions, tool call limit (5-15)
- [x] 4.3 Parse Claude's final response into structured report format (confidence score, ownership, arguments, related files, suggested team)
- [x] 4.4 Implement SSE event streaming — emit status, tool_call, tool_result, report, error, and done events

## 5. Backend — API Endpoints & Sessions

- [x] 5.1 Add startup validation: check all required env vars are present, log errors for missing ones
- [x] 5.2 Create POST /api/triage endpoint: accept ticketKey + ownedRepo + relatedRepos, validate input, start SSE stream, run analysis loop
- [x] 5.3 Create POST /api/chat endpoint: accept session ID + message, return streaming Claude response
- [x] 5.4 Implement in-memory session store with 30-minute expiry and periodic cleanup
- [x] 5.5 Handle client disconnect (abort analysis, clean up resources)

## 6. Frontend — Ticket Input & Project Settings

- [x] 6.1 Create main form: Jira ticket link/key input, owned project input, related projects input (comma-separated or multi-field), and Analyze button
- [x] 6.2 Implement localStorage persistence for owned project and related projects (auto-fill on return visits)
- [x] 6.3 Add ticket key extraction from full Jira URLs and empty-field validation

## 7. Frontend — Streaming Analysis View

- [x] 7.1 Implement SSE client to consume streaming events from POST /api/triage
- [x] 7.2 Create streaming log component: display timestamped progress events (tool calls, searches, file reads)
- [x] 7.3 Add loading state indicator and disable submit button during analysis

## 8. Frontend — Report Display

- [x] 8.1 Create triage report component: ticket summary, confidence badge (green >70%, yellow 40-70%, red <40%), ownership conclusion
- [x] 8.2 Add arguments for/against ownership sections, related files as clickable GitHub links, suggested team display
- [x] 8.3 Add error display with Retry button for failed analyses

## 9. Frontend — Follow-Up Chat

- [x] 9.1 Create chat interface component below the report with message input and send button
- [x] 9.2 Implement streaming chat responses using the POST /api/chat endpoint
- [x] 9.3 Handle session expiry: show expiry message and offer to start new analysis

## 10. Frontend — Layout & Integration

- [x] 10.1 Create simple single-column layout: centered content (max 900px), app title header
- [x] 10.2 Wire all components together: input form → streaming → report → chat flow
- [x] 10.3 Verify end-to-end flow works: enter ticket + projects → see streaming analysis → view report → ask follow-up
