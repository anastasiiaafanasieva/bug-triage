## MODIFIED Requirements

### Requirement: Server environment variables
The system SHALL manage only the Anthropic API key (ANTHROPIC_API_KEY) and MCP server connection URLs (JIRA_MCP_SERVER_URL, OCTOCODE_MCP_SERVER_URL) as server-side environment variables. The system SHALL NOT require Jira or GitHub API tokens.

#### Scenario: Server starts with MCP config
- **WHEN** the server starts with ANTHROPIC_API_KEY and MCP server URLs configured
- **THEN** it SHALL validate connectivity to MCP servers and log status
- **THEN** it SHALL start successfully

#### Scenario: Missing Anthropic key
- **WHEN** the server starts without ANTHROPIC_API_KEY
- **THEN** it SHALL log an error indicating the missing key

## REMOVED Requirements

### Requirement: Jira API token configuration
**Reason**: Jira access is now via MCP server which manages its own auth
**Migration**: Remove JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN from .env.example

### Requirement: GitHub token configuration
**Reason**: Code search is now via Octocode MCP server which manages its own auth
**Migration**: Remove GITHUB_TOKEN from .env.example
