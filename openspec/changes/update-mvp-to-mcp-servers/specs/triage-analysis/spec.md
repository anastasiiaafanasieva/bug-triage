## MODIFIED Requirements

### Requirement: Tool execution backing
The Claude agentic analysis loop SHALL execute tool calls (fetch_jira_ticket, search_code, read_file) by delegating to MCP server clients instead of direct API clients. Tool schemas visible to Claude SHALL remain unchanged.

#### Scenario: Claude calls fetch_jira_ticket tool
- **WHEN** Claude requests the fetch_jira_ticket tool with ticket_key "WEED-1234"
- **THEN** the system SHALL call the WebrixJira MCP server's `get_issues` method
- **THEN** it SHALL return the ticket data to Claude in the same format as before

#### Scenario: Claude calls search_code tool
- **WHEN** Claude requests the search_code tool with a query and repos list
- **THEN** the system SHALL call the Octocode MCP server with the search parameters
- **THEN** it SHALL return code search results to Claude in the same format as before

#### Scenario: MCP server error during analysis
- **WHEN** an MCP server returns an error during a tool call
- **THEN** the system SHALL return the error as a tool result to Claude
- **THEN** Claude SHALL continue analysis with remaining tools or provide its best analysis
