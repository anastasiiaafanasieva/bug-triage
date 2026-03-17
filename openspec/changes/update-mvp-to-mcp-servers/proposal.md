## Why

The MVP currently uses direct REST API calls (Jira Cloud API via axios, GitHub API via Octokit) for external data. The team has standardized on MCP servers — WebrixJira for Jira operations and Octocode (Webrix/octocode) for code search. Switching to MCP servers removes the need for users or deployers to manage Jira/GitHub API tokens, simplifies the server configuration, and aligns with the updated specs.

## What Changes

- **BREAKING** — Remove the Jira REST API client module (`server/src/jira.ts`); replace all Jira calls with the WebrixJira MCP server, using its `get_issues` method to retrieve tickets
- **BREAKING** — Remove the GitHub/Octokit client module (`server/src/github.ts`); replace all code search and file read calls with the Octocode MCP server
- Remove `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `GITHUB_TOKEN` from env vars and `.env.example`
- Update Claude tool definitions to route through MCP server calls instead of direct API wrappers
- Update server startup validation to check MCP server connectivity instead of env-var presence for Jira/GitHub
- Simplify `.env.example` to only require `ANTHROPIC_API_KEY` and MCP server connection config

## Capabilities

### New Capabilities

None — this change modifies existing capabilities only.

### Modified Capabilities

- `jira-integration`: Switch from direct Jira REST API to WebrixJira MCP server; use `get_issues` method for ticket retrieval
- `code-search`: Switch from GitHub REST API / Octokit to Octocode MCP server for all code search, file read, and directory listing operations
- `configuration`: Remove Jira/GitHub token requirements from server env vars; only `ANTHROPIC_API_KEY` and MCP connection config needed
- `triage-analysis`: Update the agentic tool definitions so Claude calls MCP-backed tools instead of direct API wrappers

## Impact

- **Server code:** `server/src/jira.ts` and `server/src/github.ts` are deleted and replaced with MCP client modules
- **Dependencies:** Remove `axios` (Jira), `@octokit/rest` (GitHub); add MCP client SDK (`@modelcontextprotocol/sdk`)
- **Environment:** `.env.example` shrinks — no more Jira/GitHub tokens
- **Claude tools:** Tool schemas stay the same shape (Jira fetch, code search, file read) but the handler implementations change from direct API to MCP calls
- **Frontend:** No changes — the API contract between frontend and backend is unchanged
