# Jira Integration

## Purpose

Provides the ability to fetch bug ticket data from Jira and search for related tickets. This is the primary data source for every triage analysis — the ticket description, comments, labels, and components are the starting point for determining ownership.

## Requirements

- The system SHALL use the Jira MCP server (WebrixJira) for all Jira operations, NOT direct REST API calls
- The system SHALL NOT use the Jira REST API directly
- The system SHALL use the MCP server's `get_issues` method to retrieve ticket data by key (the Jira MCP server does not have a dedicated fetch/get method — `get_issues` is the way to obtain a specific ticket)
- The system SHALL fetch a ticket's details given its key, including:
  - Summary and description (rendered HTML)
  - Status, priority, and resolution
  - Labels and components
  - Reporter and assignee
  - Linked issues
- The system SHALL fetch all comments on a given ticket
- The system SHALL support JQL search to find related tickets
- The system SHALL handle non-existent ticket keys with a clear error message
- The system SHALL handle MCP server connection errors gracefully with a clear error message

## Scenarios

### Scenario: Fetch a valid ticket
Given the Jira MCP server is available
And a ticket key WEED-1234 that exists
When the system fetches the ticket via MCP
Then it SHALL return the summary, description, status, labels, components, and priority

### Scenario: Fetch ticket comments
Given the Jira MCP server is available
And a ticket WEED-1234 with 5 comments
When the system fetches the ticket's comments via MCP
Then it SHALL return all 5 comments with author, body, and timestamp

### Scenario: Search related tickets via JQL
Given the Jira MCP server is available
And a JQL query "project = WEED AND labels = mobile-editor AND created >= -30d"
When the system executes the search via MCP
Then it SHALL return matching tickets (up to the specified limit)
And each result SHALL include at minimum the key, summary, and status

### Scenario: MCP server unavailable
When the Jira MCP server is not reachable
And the system attempts to fetch a ticket
Then it SHALL return a connection error with a message indicating the MCP server is unavailable

### Scenario: Non-existent ticket
Given the Jira MCP server is available
And a ticket key WEED-99999 that does not exist
When the system attempts to fetch the ticket
Then it SHALL return a not-found error with a message indicating the ticket does not exist
