## MODIFIED Requirements

### Requirement: Code search and file access
The system SHALL use the Octocode MCP server (Webrix/octocode) for all code search operations, NOT GitHub API or Octokit. The system SHALL NOT use GitHub REST API or Octokit directly.

#### Scenario: Search code via MCP server
- **WHEN** the system searches for keyword "SectionName" in repository "wix-private/santa-editor"
- **THEN** it SHALL call the Octocode MCP server with the search query and repository
- **THEN** it SHALL return matching file paths and code snippets

#### Scenario: Read file via MCP server
- **WHEN** the system reads file "packages/sections/scope.ts" from "wix-private/santa-editor"
- **THEN** it SHALL call the Octocode MCP server to retrieve the file content
- **THEN** it SHALL return the full file content as a string

#### Scenario: MCP server unavailable
- **WHEN** the Octocode MCP server is not reachable
- **THEN** the system SHALL return a connection error with a message indicating the MCP server is unavailable

## REMOVED Requirements

### Requirement: GitHub PAT authentication
**Reason**: Replaced by Octocode MCP server — the MCP server handles its own authentication to GitHub
**Migration**: Remove GITHUB_TOKEN env var; configure OCTOCODE_MCP_SERVER_URL instead

### Requirement: GitHub API rate limit handling with exponential backoff
**Reason**: The Octocode MCP server handles rate limiting internally
**Migration**: Remove retry/backoff logic from server code; MCP server manages this
