# Configuration

## Purpose

Allows users to configure the tool at runtime: which repository their team owns and which related repositories to search. Jira and code search are accessed via MCP servers, and Claude is accessed via the Claude CLI using existing enterprise authentication. No API tokens or credentials are needed in the UI or as server-side environment variables for LLM access. Repository settings are persisted in the browser so users don't need to re-enter them each session.

## Requirements

- The system SHALL allow the user to set their owned repository (org/repo format)
- The system SHALL allow the user to add and remove related repositories
- The system SHALL persist repository configuration in browser localStorage
- The system SHALL show a configuration panel on first launch if no config exists
- The system SHALL allow the user to access configuration at any time via a settings button
- The system SHALL NOT require the user to enter any API tokens or credentials in the UI
- The system SHALL NOT require an Anthropic API key — Claude is accessed via the Claude CLI which uses the deployer's existing Claude Code enterprise authentication
- The system SHALL require only MCP server configuration as server-side environment variables: JIRA_MCP_SERVER_URL, OCTOCODE_USER_ACCESS_KEY, OCTOCODE_BASE_URL

## Scenarios

### Scenario: First-time user
Given no configuration exists in localStorage
When the user opens the application
Then the system SHALL display the configuration panel
And the user SHALL not be able to start analysis until owned repository is set

### Scenario: Returning user
Given valid configuration exists in localStorage
When the user opens the application
Then the system SHALL load saved configuration
And the user SHALL be able to start analysis immediately

### Scenario: Add a related repository
Given the user is in the configuration panel
When the user enters "wix-private/document-management" and clicks add
Then the repository SHALL appear in the related repositories list
And it SHALL be persisted to localStorage

### Scenario: Remove a related repository
Given the user has 3 related repositories configured
When the user removes one
Then it SHALL be removed from the list and localStorage
And the remaining 2 SHALL still be present
