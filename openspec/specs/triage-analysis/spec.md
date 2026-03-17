# Triage Analysis

## Purpose

Core capability of the Bug Triage Tool. Accepts a Jira bug ticket and determines whether the bug belongs to the user's team or should be reassigned to another team. Produces a structured report with evidence, confidence score, and ownership recommendation.

## Requirements

- The system SHALL accept a Jira ticket key (e.g., WEED-1234) as input
- The system SHALL invoke the Claude CLI (`claude -p`) as the analysis engine, using the user's existing Claude Code enterprise authentication
- The system SHALL NOT use the Anthropic SDK or require an Anthropic API key
- The system SHALL pass Jira MCP (WebrixJira) and Octocode MCP server configurations to the Claude CLI via `--mcp-config` so Claude can call MCP tools directly
- The system SHALL allow Claude to autonomously call MCP tools (Jira fetch, code search, file read) during analysis via `--allowedTools mcp__jira:*,mcp__octocode:*`
- The system SHALL produce a structured triage report containing:
  - Ticket key and summary
  - Confidence score (0-100%)
  - Boolean ownership determination (is it our team or not)
  - Name of the owning team
  - List of arguments supporting our team's ownership
  - List of arguments against our team's ownership
  - List of related source files with repo, path, and explanation
  - Suggested team if the bug is not ours
  - Detailed analysis paragraph (2-3 paragraphs)
- The system SHALL stream progress events during analysis using Claude CLI's `--output-format stream-json`
- The system SHALL limit Claude to a maximum of 15 tool call turns via `--max-turns`
- The system SHALL return a session identifier with the report to enable follow-up chat
- The system SHALL complete analysis within 2 minutes for a typical ticket

## Scenarios

### Scenario: Bug clearly belongs to another team
Given a Jira ticket describing a rendering issue in the viewer
When the triage analysis runs
And code search finds the relevant rendering code only in the thunderbolt repository
Then the report SHALL set isOurTeam to false
And confidence SHALL be greater than 70
And suggestedTeam SHALL name "thunderbolt" or the appropriate team
And argumentsAgainst SHALL contain at least one reference to thunderbolt code

### Scenario: Bug clearly belongs to our team
Given a Jira ticket describing a panel UI bug in the editor
When the triage analysis runs
And code search finds the relevant panel code in the santa-editor repository
Then the report SHALL set isOurTeam to true
And confidence SHALL be greater than 70
And relatedFiles SHALL contain at least one file from santa-editor

### Scenario: Bug is ambiguous across teams
Given a Jira ticket with a vague description and no stack trace
When code search finds related code in multiple repositories
Then confidence SHALL be less than 50
And the report SHALL contain arguments both for and against ownership
And the analysis SHALL explicitly state the ambiguity

### Scenario: Bug spans multiple teams
Given a Jira ticket where the root cause is in one repo but the symptom manifests in another
When the triage analysis identifies code in both repos
Then the report SHALL explain the boundary between the repos
And relatedFiles SHALL contain files from both repos
And the analysis SHALL identify where the root cause likely is vs. where the symptom appears
