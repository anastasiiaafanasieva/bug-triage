## Context

The MVP currently uses direct API calls: `server/src/jira.ts` calls Jira REST API with base64 auth headers, and `server/src/github.ts` uses Octokit with a personal access token. Both modules are imported by `server/src/analysis.ts` which defines Claude tool handlers that delegate to these clients.

The team has standardized on MCP servers — WebrixJira for Jira operations and Octocode (Webrix/octocode) for code search. The specs for `jira-integration`, `code-search`, and `configuration` have already been updated to mandate MCP-only access. This change updates the implementation to match.

## Goals / Non-Goals

**Goals:**
- Replace direct Jira REST API calls with WebrixJira MCP server calls
- Replace Octokit-based GitHub calls with Octocode MCP server calls
- Remove Jira and GitHub credentials from server env vars
- Keep the Claude agentic loop and SSE streaming unchanged
- Keep the frontend completely unchanged — same API contract

**Non-Goals:**
- Changing the Claude tool schemas (names/parameters stay the same from Claude's perspective)
- Adding new capabilities or UI features
- Refactoring the analysis loop or report parsing
- Adding MCP server health monitoring or dashboards

## Decisions

### D1: MCP Client SDK for server-side MCP communication

**Decision:** Use `@modelcontextprotocol/sdk` to create MCP clients that connect to WebrixJira and Octocode servers. Create a single `server/src/mcp.ts` module that initializes both MCP clients and exposes typed wrapper functions.

**Rationale:** The official MCP SDK provides a standard client implementation with connection management, error handling, and typed tool calls. A single module keeps MCP connection logic centralized.

**Alternatives considered:**
- Raw HTTP/stdio calls to MCP servers — would need to implement the MCP protocol manually, error-prone
- One module per MCP server — unnecessary separation for two clients that share the same initialization pattern

### D2: Replace jira.ts and github.ts with mcp.ts

**Decision:** Delete `server/src/jira.ts` and `server/src/github.ts`. Create `server/src/mcp.ts` that exports the same function signatures (`fetchTicketWithComments`, `searchCode`, `readFileContent`, `listDirectory`) but backed by MCP calls instead of direct APIs.

**Rationale:** Keeping the same exported function signatures means `analysis.ts` needs minimal changes — just update the import path. The Claude tool definitions and the `executeTool` function stay the same.

**Alternatives considered:**
- Adapter pattern wrapping MCP calls in existing modules — adds a layer without benefit
- Exposing raw MCP calls in analysis.ts — would scatter MCP protocol details throughout the codebase

### D3: MCP server connection config via environment variables

**Decision:** MCP server connection details are configured via env vars: `JIRA_MCP_SERVER_URL` and `OCTOCODE_MCP_SERVER_URL` (or equivalent connection strings depending on transport). Fall back to reasonable defaults if the MCP servers are local.

**Rationale:** Keeps the same pattern as the existing env-var-based config but with fewer secrets. MCP servers handle their own auth to Jira/GitHub.

### D4: Lazy MCP client initialization with connection validation at startup

**Decision:** MCP clients are created lazily on first use but validated at server startup (a lightweight connectivity check). If an MCP server is unreachable at startup, log a warning but don't crash — the server can still start and return clear errors when analysis is attempted.

**Rationale:** Startup validation gives early feedback about misconfiguration. Not crashing allows partial functionality (e.g., the frontend can still load).

## Risks / Trade-offs

- **MCP server availability becomes a runtime dependency** → The server itself has no fallback if MCP servers are down. Mitigate with clear error messages that identify which MCP server is unreachable.
- **MCP protocol overhead vs direct API calls** → Minimal; MCP adds one hop. For the 5-15 tool calls per analysis this is negligible.
- **Breaking change for existing deployments** → Anyone who deployed the MVP with Jira/GitHub env vars will need to reconfigure. Mitigate by updating `.env.example` and documenting the migration.
- **No retry/backoff at MCP level** → MCP servers are expected to handle their own retries to upstream APIs. If this proves insufficient, add retry logic in `mcp.ts` later.
