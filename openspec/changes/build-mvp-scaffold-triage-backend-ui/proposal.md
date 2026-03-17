## Why

The bug triage tool has complete specs but no implementation yet. The triage team currently spends 30-60 minutes per ticket manually determining ownership across santa-editor and related packages. We need a working MVP that connects Jira ticket data and multi-repo code search to Claude's analysis, with a basic UI to make it usable by the triage team immediately.

## What Changes

- Scaffold the full project structure: React frontend, Node.js/Express backend, shared types
- Implement the triage analysis backend: Jira integration, GitHub code search, Claude AI analysis with streaming
- Build a basic web UI: configuration panel, ticket input, real-time streaming report display, follow-up chat
- Wire end-to-end: frontend calls backend APIs, backend orchestrates Jira → code search → Claude analysis → streamed report

## Capabilities

### New Capabilities
- `project-scaffold`: Project structure, build tooling, dev server setup, shared types, and deployment configuration
- `triage-api`: Backend API endpoints for triage analysis orchestration — accepts ticket key, coordinates Jira fetch + code search + Claude analysis, streams progress and results
- `basic-ui`: Minimal React frontend with configuration panel, ticket input form, streaming report display, and follow-up chat interface

### Modified Capabilities

_None — this is a greenfield implementation. Existing specs (jira-integration, code-search, triage-analysis, report-display, follow-up-chat, configuration) define requirements but no implementation exists yet to modify._

## Impact

- **New code:** Entire application codebase — frontend, backend, shared packages
- **Dependencies:** React, Express, Anthropic SDK, Jira REST API client, GitHub REST API (via Octokit)
- **APIs:** New backend REST/SSE endpoints for triage analysis, Jira proxy, GitHub code search proxy
- **External systems:** Jira Cloud API, GitHub API, Anthropic Claude API
- **Infrastructure:** Single deployable Node.js app serving both API and static frontend assets
