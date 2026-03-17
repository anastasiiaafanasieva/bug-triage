# Bug Triage Tool — Product Requirements Document

## Problem

The santa-editor triage team receives bug reports from customer support and other channels. Many of these bugs are filed against santa-editor, but after developer investigation, a significant portion turn out to belong to other teams/packages (document-services, thunderbolt, viewer-platform, etc.).

Currently, determining ownership requires:
1. A developer manually reading the Jira ticket
2. Searching code across multiple repositories
3. Tracing the bug through architectural layers
4. Making a judgment call based on experience

This process takes 30-60 minutes per ticket and often requires senior developer knowledge of cross-package boundaries. The triage team handles 10-20 tickets per week, creating a significant time drain.

## Users

**Primary:** Triage team members (4-6 developers) who review incoming bugs weekly.

**Secondary:** Any developer who receives a bug and wants a quick ownership assessment before deep-diving.

## Goals

1. **Reduce triage time** from 30-60 minutes to under 5 minutes per ticket
2. **Provide evidence-based decisions** — not just a guess, but code references and reasoning
3. **Enable follow-up investigation** — after initial analysis, let the user ask deeper questions
4. **Make team boundaries visible** — show which repo/package likely owns the issue

## Features

### F1: Jira Ticket Analysis
Accept a Jira ticket key, fetch all relevant data (summary, description, comments, labels, components, linked issues), and extract key information for analysis.

### F2: Multi-Repo Code Search
Search code across the team's owned repository and configurable related repositories. Find relevant files, functions, error handlers, and component code that matches the bug description.

### F3: AI-Powered Triage Report
Use Claude to analyze the ticket data and code search results, producing a structured report with:
- Ownership conclusion (our team vs. another team)
- Confidence score (0-100%)
- Arguments for and against ownership
- Related source files with explanations
- Suggested owning team if not ours

### F4: Follow-Up Chat
After the initial report, allow the user to ask follow-up questions with full context preserved:
- "Search deeper in package X"
- "What would the fix look like?"
- "Find similar bugs from the last month"
- Claude retains all ticket data, code it found, and its analysis

### F5: Configuration
Runtime configuration of:
- Owned repository (e.g., `wix-private/santa-editor`)
- Related repositories to search
- API tokens (Jira, GitHub, Anthropic)
- Persisted in browser localStorage

### F6: Real-Time Progress
Stream Claude's analysis progress in real-time — show which tools it's calling, what it's searching for, what files it's reading. The user should see the investigation unfold live.

## Success Metrics

| Metric | Target |
|--------|--------|
| Ownership prediction accuracy | > 80% agreement with developer assessment |
| Time to triage decision | < 5 minutes (including follow-up questions) |
| Team adoption | All triage team members using it within 2 weeks |
| Tickets requiring manual re-triage | < 20% of AI-triaged tickets |

## Out of Scope (v1)

- Automatic Jira ticket reassignment
- Integration with Slack or other notification systems
- Historical analytics dashboard
- Multi-ticket batch analysis
- Custom prompt/system message editing in UI
