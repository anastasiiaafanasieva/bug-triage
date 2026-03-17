## MODIFIED Requirements

### Requirement: Jira authentication and access
The system SHALL use the Jira MCP server (WebrixJira) for all Jira operations, NOT direct REST API calls. The system SHALL NOT use the Jira REST API directly. The system SHALL use the MCP server's `get_issues` method to retrieve ticket data by key.

#### Scenario: Fetch a ticket via MCP server
- **WHEN** the system needs to fetch ticket WEED-1234
- **THEN** it SHALL call the WebrixJira MCP server's `get_issues` method with the ticket key
- **THEN** it SHALL return the summary, description, status, labels, components, and priority

#### Scenario: MCP server unavailable
- **WHEN** the WebrixJira MCP server is not reachable
- **THEN** the system SHALL return a connection error with a message indicating the MCP server is unavailable

## REMOVED Requirements

### Requirement: Direct Jira REST API authentication
**Reason**: Replaced by WebrixJira MCP server — the MCP server handles its own authentication to Jira
**Migration**: Remove JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN env vars; configure JIRA_MCP_SERVER_URL instead

### Requirement: Per-request Jira credentials
**Reason**: MCP server manages credentials internally; no tokens need to flow through this application
**Migration**: Remove credential validation and auth header construction from server code
