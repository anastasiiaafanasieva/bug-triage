# Triage Skill Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the bug triage tool from a `.claude/commands/triage.md` command into a plugin-ready `skills/triage/SKILL.md` skill with regression detection, cleaner output, GitHub fallback, and Slack context extraction.

**Architecture:** Single skill file (`SKILL.md`) containing the full triage prompt — input parsing, analysis flow with regression branch, GitHub MCP with `gh` CLI fallback, Slack link detection, clarifying question triggers, and output template. Supporting files: config example, MCP example, README, AGENTS.md for cross-platform support.

**Tech Stack:** Claude Code skills (markdown prompts), Jira MCP, GitHub MCP (Octocode), Slack MCP, `gh` CLI

---

### Task 1: Create the skill directory and SKILL.md — Input & Configuration sections

**Files:**
- Create: `skills/triage/SKILL.md`

This task writes the first part of SKILL.md: the frontmatter, description, input parsing, and configuration resolution logic.

- [ ] **Step 1: Create `skills/triage/SKILL.md` with frontmatter, input parsing, and config resolution**

```markdown
---
name: triage
description: Analyze a Jira bug ticket to determine which team/repository owns the issue. Supports regression detection, dependency bump analysis, and multi-repo investigation.
---

You are a bug triage analyst. Your job is to analyze a Jira bug ticket and determine which team/repository owns the issue.

## Input

The user provides: $ARGUMENTS

Parse the input:
- First argument: Jira ticket key (e.g., `WEED-34336`) or full URL (e.g., `https://wix.atlassian.net/browse/WEED-34336`). Extract the key from the URL if needed.
- `--owned <repo>`: Override the owned project (optional).
- `--related <repo1,repo2>`: Override related projects (optional, comma-separated).
- Any remaining free text after the ticket key (that isn't a flag) is user-provided context. Use it as additional signal during analysis.

## Configuration

Read `.triage-config.json` from the project root for default values:
```json
{
  "ownedProject": "org/repo",
  "relatedProjects": ["org/repo1", "org/repo2"]
}
```

**Resolution order:**
1. CLI flags `--owned` / `--related` — highest priority, override everything.
2. `.triage-config.json` — default values.
3. No config file exists at all — ask the user for their owned project before proceeding.
```

- [ ] **Step 2: Verify the file exists and is valid markdown**

Run: `cat skills/triage/SKILL.md | head -5`
Expected: The frontmatter `---` lines and `name: triage`

- [ ] **Step 3: Commit**

```bash
git add skills/triage/SKILL.md
git commit -m "feat: create triage skill with input parsing and config sections"
```

---

### Task 2: Add the MCP tools and GitHub fallback section to SKILL.md

**Files:**
- Modify: `skills/triage/SKILL.md`

Append the MCP tools section that defines which tools to use and the silent `gh` CLI fallback behavior.

- [ ] **Step 1: Append the MCP tools and fallback section to SKILL.md**

Add after the Configuration section:

```markdown
## Tools

### Jira MCP
Use the Jira MCP tools (`jira__get-issues`) to fetch ticket data: summary, description, comments, labels, status, priority, components, and assignee. This is required — if Jira MCP is unavailable, inform the user and stop.

### GitHub — MCP with `gh` CLI Fallback
Use GitHub MCP tools (Octocode) for all code investigation:
- `octocode__githubSearchCode` — search for keywords across repositories
- `octocode__githubGetFileContent` — read specific files
- `octocode__githubViewRepoStructure` — explore repository layout
- `octocode__githubSearchPullRequests` — find relevant PRs

**Fallback:** If any GitHub MCP call fails (timeout, auth error, server unavailable), silently retry the same operation using the `gh` CLI. Do not inform the user about the fallback. Equivalent `gh` commands:
- Search code: `gh search code "<query>" --repo <owner/repo> --limit 10`
- Get file content: `gh api repos/<owner/repo>/contents/<path> --jq '.content' | base64 -d`
- View repo structure: `gh api repos/<owner/repo>/git/trees/master --jq '.tree[].path'`
- Search PRs: `gh search prs "<query>" --repo <owner/repo> --limit 10`
- List release PRs: `gh pr list --repo <owner/repo> --state merged --base master --limit 50`
- Get tags: `gh api repos/<owner/repo>/tags --jq '.[].name'`
- Compare tags: `gh api repos/<owner/repo>/compare/<tag1>...<tag2> --jq '.commits[].commit.message'`

### Slack MCP
Scan the Jira ticket description and comments for Slack links (e.g., URLs containing `slack.com/archives`). If found, use Slack MCP tools to fetch the linked thread:
- `slack__get_thread_replies` — get the full thread
- `slack__search-messages` — search for context

Include the Slack thread content as additional context for your analysis. If Slack MCP is unavailable, skip silently and continue without Slack context.
```

- [ ] **Step 2: Verify the section was added**

Run: `grep -c "gh CLI Fallback" skills/triage/SKILL.md`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add skills/triage/SKILL.md
git commit -m "feat: add MCP tools and gh CLI fallback section to triage skill"
```

---

### Task 3: Add the core analysis flow to SKILL.md

**Files:**
- Modify: `skills/triage/SKILL.md`

Append the main analysis process — steps 1-7 from the spec, excluding the regression branch (that's Task 4).

- [ ] **Step 1: Append the analysis flow section to SKILL.md**

Add after the Tools section:

```markdown
## Analysis Process

### Step 1: Fetch the Jira Ticket
Fetch the ticket using Jira MCP (`jira__get-issues`). Extract:
- Summary (title)
- Description
- Comments
- Labels
- Status, priority, components, assignee

If the user provided free-text context alongside the ticket key, note it as additional signal.

### Step 2: Check for Slack Links
Scan the description and comments for Slack links. If found, fetch the linked Slack threads using Slack MCP and include them as context.

### Step 3: Detect Regression
Check for regression signals:
- The title, description, or comments contain the word "regression" (case-insensitive).
- The ticket has a "Regression" label.

If regression is detected, follow the **Regression Investigation** process below before continuing to Step 4.

### Step 4: Search for Relevant Code
Search across the owned repository and related repositories using keywords from the ticket — error messages, component names, file paths mentioned in the description or stack traces.

Read specific files to understand code ownership and architecture when search results look promising. Explore repository structure if needed to understand package boundaries.

Be thorough but efficient — focus on finding evidence for ownership. Investigate 5-10 code locations typically.

### Step 5: Clarify If Needed
If the ticket is too vague to proceed meaningfully, pause and ask the user a specific clarifying question. Triggers:
- No error message, stack trace, or component name anywhere in the ticket.
- Description is extremely short or generic (e.g., "it doesn't work").
- Cannot determine which area of the codebase to investigate.

Explain what's missing and ask one focused question. Do NOT ask upfront questions — only pause mid-analysis when you genuinely cannot proceed.

### Step 6: Determine Ownership
Based on the evidence gathered, determine whether the bug's root cause likely lives in the owned repository or in another repository. Consider:
- Where the relevant code lives
- Which team last modified the suspicious files
- Whether the bug is in a dependency vs. the owned code
- Regression analysis findings (if applicable)

### Step 7: Output the Triage Report
Use the output format defined below.
```

- [ ] **Step 2: Verify the section was added**

Run: `grep -c "Analysis Process" skills/triage/SKILL.md`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add skills/triage/SKILL.md
git commit -m "feat: add core analysis flow to triage skill"
```

---

### Task 4: Add the regression investigation section to SKILL.md

**Files:**
- Modify: `skills/triage/SKILL.md`

Append the regression-specific investigation flow — version extraction, PR investigation, and dependency bump analysis.

- [ ] **Step 1: Append the regression investigation section to SKILL.md**

Add after Step 3 (Detect Regression) in the Analysis Process, before Step 4:

```markdown
### Regression Investigation

Only run this section if regression was detected in Step 3.

#### 3a: Extract Version
Parse the ticket title, description, and comments for a version number associated with the regression. Look for patterns like:
- "regression in 1.2.3"
- "regressed since v2.0.0"
- "broke in version 1.5.0"
- "started happening after 3.1.0"

If no version is found, note this and proceed to Step 4 without regression-specific investigation.

#### 3b: Find the Git Tag/Release
Search for a git tag or release in the owned repo matching the extracted version:
- Use `gh api repos/<owner/repo>/tags --jq '.[].name'` to list tags.
- Match the version number against tag names (e.g., `v1.2.3`, `1.2.3`, `release-1.2.3`).

If no matching tag is found, note this and proceed to Step 4.

#### 3c: List PRs in That Release
Find all PRs merged between the previous tag and the regression tag:
- Use `gh api repos/<owner/repo>/compare/<previous-tag>...<regression-tag>` to get the commit diff.
- Cross-reference commit messages with PRs using `gh search prs` or `gh pr list`.

#### 3d: Check PRs for Suspicious Changes
Scan each PR's title, description, and changed files for relevance to the bug's symptoms:
- Does the PR touch components or files related to the bug?
- Does the PR description mention the affected feature?
- Does the PR change behavior that could cause the reported symptoms?

If a suspect PR is found, record it for the report and proceed to Step 4.

#### 3e: Dependency Bump Analysis
Only run this if Step 3d found no direct suspect PR.

Among the PRs in the release, look for dependency version bump PRs:
- PRs titled "bump responsive-editor-packages", "bump REP", or similar dependency update patterns.
- For each bump PR found:
  1. Read the PR diff to extract the old and new dependency version numbers.
  2. Search the dependency repository for changes between those two versions (tags, releases, or commits).
  3. Check if any of those dependency changes are related to the bug's symptoms.

Record any suspicious dependency changes for the report.

#### 3f: Continue
Proceed to Step 4 with all regression findings collected.
```

- [ ] **Step 2: Verify the section was added**

Run: `grep -c "Dependency Bump Analysis" skills/triage/SKILL.md`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add skills/triage/SKILL.md
git commit -m "feat: add regression investigation flow to triage skill"
```

---

### Task 5: Add the output format to SKILL.md

**Files:**
- Modify: `skills/triage/SKILL.md`

Append the output format template — the exact report structure the skill should produce.

- [ ] **Step 1: Append the output format section to SKILL.md**

Add after the Analysis Process section:

````markdown
## Output Format

After your investigation, output the triage report in this exact format:

---

## Triage Report: {TICKET_KEY}

**{ticket summary}**

### Confidence: {0-100}% — {High/Medium/Low}

> **Ownership:** {Our team / Not our team} — likely belongs to **{team/repo name}**

### Arguments For (our team owns this)
- {evidence point}
- {evidence point}

### Arguments Against (another team owns this)
- {evidence point}
- {evidence point}

### Regression Analysis
{Only include this section if regression was detected. Use a bullet list:
- Version identified: {version}
- Suspect PR(s): {link + what it changed + why it is suspicious}
- Or: dependency bump from {old version} to {new version} in {package name}, changes include {summary of relevant changes}
- If regression was detected but investigation found nothing: "No regression evidence found in PRs for this version."}

### Suggested Team
{If not our team: which team/repo should own this, and why.
If our team: "N/A — this is ours."}

### Detailed Analysis
{2-3 paragraphs explaining your reasoning, the evidence trail, and how you reached your conclusion. Mention key files inline where relevant — do not use a separate table.}

### Summary
{2-3 sentences max. What is broken, who should fix it, what is the next step. No jargon, no code references. Strict and direct.}

---
````

- [ ] **Step 2: Verify the output format was added**

Run: `grep -c "Triage Report:" skills/triage/SKILL.md`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add skills/triage/SKILL.md
git commit -m "feat: add output format template to triage skill"
```

---

### Task 6: Remove old command and update config examples

**Files:**
- Delete: `.claude/commands/triage.md`
- Modify: `.triage-config.json.example` (verify it's correct)
- Modify: `.mcp.json.example` (add Slack MCP)

- [ ] **Step 1: Delete the old command file**

```bash
rm .claude/commands/triage.md
```

- [ ] **Step 2: Verify `.triage-config.json.example` matches the spec**

The file should contain:
```json
{
  "ownedProject": "org/repo",
  "relatedProjects": [
    "org/repo1",
    "org/repo2"
  ]
}
```

Read the current file. If it already matches this structure (with placeholder values), no changes needed. If it uses real repo names instead of placeholders, update it to use `org/repo` placeholders.

- [ ] **Step 3: Update `.mcp.json.example` to include Slack MCP**

The file should contain Jira, Octocode, and Slack servers:
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@mcp-s/mcp"],
      "env": {
        "USER_ACCESS_KEY": "your-access-key-here",
        "BASE_URL": "https://mcp-s.wewix.net",
        "MCP": "jira"
      }
    },
    "octocode": {
      "command": "npx",
      "args": ["-y", "@mcp-s/mcp"],
      "env": {
        "USER_ACCESS_KEY": "your-access-key-here",
        "BASE_URL": "https://mcp-s.wewix.net",
        "MCP": "octocode"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@mcp-s/mcp"],
      "env": {
        "USER_ACCESS_KEY": "your-access-key-here",
        "BASE_URL": "https://mcp-s.wewix.net",
        "MCP": "slack"
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git rm .claude/commands/triage.md
git add .triage-config.json.example .mcp.json.example
git commit -m "chore: remove old triage command, update config examples with Slack MCP"
```

---

### Task 7: Create README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md with installation and usage docs**

```markdown
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

### 1. Install as a Claude Code plugin

```bash
claude plugin install <plugin-name>
```

Or clone this repo and symlink:
```bash
git clone <repo-url>
cd bug-triage
```

### 2. Configure MCP servers

Copy `.mcp.json.example` to `.mcp.json` and fill in your access key:

```bash
cp .mcp.json.example .mcp.json
```

Required MCP servers:
- **Jira** — for fetching ticket data
- **Octocode** (GitHub) — for code search and PR investigation
- **Slack** (optional) — for fetching linked Slack threads

### 3. Configure your project

Copy `.triage-config.json.example` to `.triage-config.json` and set your repos:

```bash
cp .triage-config.json.example .triage-config.json
```

```json
{
  "ownedProject": "your-org/your-repo",
  "relatedProjects": [
    "your-org/dependency-1",
    "your-org/dependency-2"
  ]
}
```

### 4. Install `gh` CLI (recommended)

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
| `--owned <repo>` | Override the owned project from config. |
| `--related <repo1,repo2>` | Override related projects (comma-separated). |
| Free text | Any additional context or suspicions. |
```

- [ ] **Step 2: Verify the file exists**

Run: `head -3 README.md`
Expected: `# Bug Triage`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

### Task 8: Create AGENTS.md for cross-platform support

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Create AGENTS.md**

```markdown
# Bug Triage Agent

This project provides a bug triage skill. When a user asks to triage a Jira ticket, follow the instructions in `skills/triage/SKILL.md`.

## Quick Reference

- Skill prompt: `skills/triage/SKILL.md`
- Config: `.triage-config.json` (per-user, gitignored)
- Config template: `.triage-config.json.example`
- MCP config template: `.mcp.json.example`
```

- [ ] **Step 2: Verify the file exists**

Run: `head -3 AGENTS.md`
Expected: `# Bug Triage Agent`

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add AGENTS.md for cross-platform support"
```

---

### Task 9: Manual Testing

No automated tests for a prompt-based skill. Instead, run the skill against a real Jira ticket to verify it works end-to-end.

- [ ] **Step 1: Test basic triage (non-regression ticket)**

Run: `/triage <a-known-non-regression-ticket-key>`

Verify:
- Jira ticket is fetched correctly
- Code search runs across owned and related repos
- Report output matches the format from the spec (no file table, tight summary)
- No "Regression Analysis" section appears

- [ ] **Step 2: Test regression triage**

Run: `/triage <a-known-regression-ticket-key>`

Verify:
- Regression is detected (from label or text)
- Version is extracted
- PR investigation runs
- "Regression Analysis" section appears in output
- Dependency bump analysis runs if no direct suspect PR found

- [ ] **Step 3: Test with user context**

Run: `/triage <ticket-key> I think this is related to the panel resize feature`

Verify:
- The user context is incorporated into the analysis

- [ ] **Step 4: Test GitHub fallback**

Temporarily disable the GitHub MCP server, then run a triage. Verify:
- The skill silently falls back to `gh` CLI
- The report is still generated

- [ ] **Step 5: Test Slack link extraction**

Run: `/triage <ticket-with-slack-link>`

Verify:
- Slack link is detected in the ticket
- Slack thread is fetched and used as context
