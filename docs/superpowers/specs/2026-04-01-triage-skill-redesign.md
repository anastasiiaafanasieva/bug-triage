# Triage Skill Redesign

## Overview

Rewrite the bug triage tool from a Claude Code command (`.claude/commands/triage.md`) into a plugin-ready skill (`skills/triage/SKILL.md`). The skill analyzes a Jira bug ticket and determines which team/repository owns the issue, with special handling for regressions and a cleaner, more readable output.

## Goals

- Readable, concise output — no file tables, tight summary, evidence inline
- Regression-aware — detect regressions, investigate PRs in the flagged version, check dependency bumps
- Clarifying questions mid-analysis when ticket info is insufficient
- GitHub MCP with silent `gh` CLI fallback
- Slack context extraction when Slack links appear in the ticket
- Plugin-ready folder structure for future distribution

## Project Structure

```
bug-triage/
├── skills/
│   └── triage/
│       └── SKILL.md              # Main triage skill prompt
├── .triage-config.json            # Per-user config (gitignored)
├── .triage-config.json.example    # Template for users
├── .mcp.json                      # MCP server config (gitignored)
├── .mcp.json.example              # Template for MCP setup
├── README.md                      # Installation & usage docs
└── AGENTS.md                      # Cross-platform support (Codex, etc.)
```

The old `.claude/commands/triage.md` is removed once the skill is in place.

## Input Format

```
/triage WEED-34336
/triage https://wix.atlassian.net/browse/WEED-34336
/triage WEED-34336 --owned org/repo --related org/repo1,org/repo2
/triage WEED-34336 I suspect this is related to the new drag-and-drop feature
```

- First argument: Jira ticket key or full URL. Extract key from URL if needed.
- `--owned <repo>`: Override owned project (optional).
- `--related <repo1,repo2>`: Override related projects (optional, comma-separated).
- Any remaining free text after the ticket key (that isn't a flag) is treated as user-provided context and fed into the analysis.

## Configuration

**File:** `.triage-config.json` in the project root.

```json
{
  "ownedProject": "org/repo",
  "relatedProjects": ["org/repo1", "org/repo2"]
}
```

**Resolution order:**
1. CLI flags `--owned` / `--related` — highest priority
2. `.triage-config.json` — default
3. No config file exists at all — ask the user for their owned project before proceeding

## MCP Requirements

| MCP Server | Purpose | Fallback |
|------------|---------|----------|
| Jira MCP | Fetch ticket: summary, description, comments, labels, status, priority, components, assignee | None — required |
| GitHub MCP (Octocode) | Code search, file content, repo structure, PR search | Silent fallback to `gh` CLI |
| Slack MCP | Fetch Slack thread when a Slack link is found in the Jira ticket | None — skip if unavailable |

**GitHub fallback behavior:** Every GitHub MCP call (search code, get file content, view repo structure, search PRs) tries MCP first. If MCP fails, silently retry the equivalent operation using `gh` CLI. Do not inform the user about the fallback.

**Slack behavior:** Scan the Jira ticket description and comments for Slack links. If found, use Slack MCP to fetch the linked thread and include it as additional context for the analysis. If Slack MCP is unavailable, skip silently.

## Analysis Flow

```
1. Parse input (Jira key + optional flags + user context)
        │
2. Fetch Jira ticket (summary, description, comments, labels)
        │
3. Detect regression? ──── yes ──→ 3a. Extract version from ticket text
        │                              │
        │                         3b. Find git tag/release for that version
        │                              in the owned repo
        │                              │
        │                         3c. List PRs included in that release
        │                              │
        │                         3d. Check PRs for suspicious changes
        │                              related to the bug
        │                              │
        │                         3e. If no suspect found → check for
        │                             dependency version bump PRs
        │                             (e.g. "bump responsive-editor-packages"
        │                             / "bump REP"). Diff the old vs new
        │                             dependency version and find what
        │                             changed in that dependency.
        │                              │
        no                        3f. Rejoin main flow with findings
        │                              │
4. Search code in owned + related repos ◄──┘
   (MCP first, gh CLI fallback — silent)
        │
5. Unclear ticket? → Ask user clarifying questions
        │
6. Determine ownership based on evidence
        │
7. Output triage report
```

### Step 3: Regression Detection

**Detection:** Check the Jira ticket for regression signals:
- Title, description, or comments contain the word "regression" (case-insensitive)
- Ticket has a "Regression" label

**Version extraction:** Parse the ticket text for a version number associated with the regression (e.g., "regression in 1.2.3", "regressed since v2.0.0").

**PR investigation:**
1. Find the git tag or release in the owned repo matching the extracted version.
2. List all PRs merged in that release (between the previous tag and this one).
3. Scan PR titles, descriptions, and changed files for relevance to the bug's symptoms.
4. If a suspect PR is found, report it.

**Dependency bump analysis** (only if no direct suspect PR found):
1. Among the PRs in the release, look for dependency version bump PRs (e.g., "bump responsive-editor-packages", "bump REP").
2. For each bump PR, extract the old and new dependency version from the diff.
3. Find what commits/changes went into the dependency between those two versions.
4. Report any suspicious changes found in the dependency.

### Step 5: Clarifying Questions

The skill asks the user for more context only when the Jira ticket is too vague to proceed meaningfully. Triggers:
- No error message, stack trace, or component name anywhere in the ticket
- Description is extremely short or generic (e.g., "it doesn't work")
- Cannot determine which area of the codebase to investigate

The skill pauses, explains what's missing, and asks a specific question. It does NOT ask upfront questions — the user provides any extra context alongside the Jira link at invocation time.

## Output Format

```markdown
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
{Only shown if regression was detected. Bullet list:
- Version identified: {version}
- Suspect PR(s): {link + what it changed + why suspicious}
- Or: dependency bump from {old} to {new} in {package}, changes include {summary}
- "No regression evidence found in PRs for this version" if nothing turned up}

### Suggested Team
{If not our team: which team/repo should own this.
If our team: "N/A — this is ours."}

### Detailed Analysis
{2-3 paragraphs: reasoning, evidence trail, how you reached the conclusion.
Mention key files inline where relevant — no separate table.}

### Summary
{2-3 sentences max. What's broken, whose fault, what to do.
No jargon, no code references. Strict and direct.}
```

**Changes from current format:**
- Removed: Related Files table
- Removed: "Potentially Introducing PR" section (merged into Regression Analysis, conditional)
- Added: Regression Analysis section (only shown when regression detected)
- Trimmed: "Plain Language Summary" → "Summary" — 2-3 sentences max, no analogies
- Kept: Detailed Analysis at 2-3 paragraphs, key files mentioned inline

## Cross-Platform Support

The plugin structure supports future adapters:
- **Claude Code**: `skills/triage/SKILL.md` — invoked as `/triage`
- **Codex**: `AGENTS.md` references the triage prompt
- **Gemini CLI**: `GEMINI.md` references the triage prompt

The core triage logic lives in `SKILL.md`. Platform adapters point to it.
