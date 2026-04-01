# Bug Triage

A Claude Code skill for analyzing Jira bug tickets and determining which team/repository owns the issue.

## Features

- Fetches and analyzes Jira tickets automatically
- Searches code across owned and related repositories to find evidence
- Detects regressions and investigates PRs in the flagged version
- Checks dependency version bumps when no direct suspect PR is found
- Extracts context from linked Slack threads
- Falls back to `gh` CLI when GitHub MCP is unavailable
- Asks clarifying questions when ticket info is insufficient
- Produces a clean, readable triage report

## Setup

### 1. Clone the repository

```bash
git clone <repo-url> bug-triage
cd bug-triage
```

### 2. Ensure MCP servers are configured

The skill requires the following MCP servers to be available in your Claude Code environment:
- **Jira** — for fetching ticket data
- **Octocode** (GitHub) — for code search and PR investigation
- **Slack** (optional) — for fetching linked Slack threads

### 3. Install `gh` CLI (recommended)

The skill falls back to `gh` CLI when GitHub MCP is unavailable:

```bash
brew install gh
gh auth login
```

## Usage

```
/triage WEED-34336
/triage https://wix.atlassian.net/browse/WEED-34336
/triage WEED-34336 --owned org/repo --related org/repo1,org/repo2
/triage WEED-34336 I suspect this is related to the drag-and-drop feature
```

### Arguments

| Argument | Description |
|----------|-------------|
| Ticket key or URL | Required. The Jira ticket to analyze. |
| `--owned <repo>` | Set the owned project repository. |
| `--related <repo1,repo2>` | Set related projects (comma-separated). |
| Free text | Any additional context or suspicions. |

### Configuration

The skill reads default repositories from `.triage-config.json`. You can override these at any time using the `--owned` and `--related` flags.
