## 1. Dependencies and Configuration

- [x] 1.1 Remove `octokit` package from server dependencies; add `@modelcontextprotocol/sdk`
- [x] 1.2 Update `.env.example`: remove JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, GITHUB_TOKEN; add JIRA_MCP_SERVER_URL and OCTOCODE_MCP_SERVER_URL
- [x] 1.3 Update server startup validation (`server/src/index.ts`): check for ANTHROPIC_API_KEY and MCP server URLs instead of Jira/GitHub tokens

## 2. MCP Client Module

- [x] 2.1 Create `server/src/mcp.ts`: initialize MCP clients for WebrixJira and Octocode with connection config from env vars
- [x] 2.2 Implement `fetchTicketWithComments` in mcp.ts: call WebrixJira `get_issues` method, map response to existing JiraTicket type
- [x] 2.3 Implement `fetchComments` in mcp.ts: retrieve comments via WebrixJira MCP, map to JiraComment type
- [x] 2.4 Implement `searchCode` in mcp.ts: call Octocode MCP for code search, map response to CodeSearchResult type
- [x] 2.5 Implement `readFileContent` in mcp.ts: call Octocode MCP for file content, map response to FileContent type
- [x] 2.6 Implement `listDirectory` in mcp.ts: call Octocode MCP for directory listing, map response to existing return type
- [x] 2.7 Add MCP connection error handling: catch connection failures and return clear error messages identifying which MCP server is unreachable

## 3. Update Analysis Module

- [x] 3.1 Update imports in `server/src/analysis.ts`: replace jira.ts and github.ts imports with mcp.ts imports
- [x] 3.2 Remove `JiraError` usage from analysis.ts — replace with generic error handling for MCP errors

## 4. Cleanup

- [x] 4.1 Delete `server/src/jira.ts`
- [x] 4.2 Delete `server/src/github.ts`
- [x] 4.3 Run `npm install` to update lock file after dependency changes

## 5. Verification

- [x] 5.1 Verify TypeScript compilation succeeds (`npm run build`)
- [x] 5.2 Verify no remaining references to Octokit, JIRA_API_TOKEN, or GITHUB_TOKEN in server code
