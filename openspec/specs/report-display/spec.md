# Report Display

## Purpose

Renders the triage analysis report in a clear, scannable UI. The report is the primary output of the tool — it must make the ownership decision, confidence level, and supporting evidence immediately visible so the triage team can act quickly.

## Requirements

- The system SHALL display the ticket key and summary at the top of the report
- The system SHALL display a confidence badge with percentage (0-100%)
  - Green (> 70%): high confidence
  - Yellow (40-70%): medium confidence
  - Red (< 40%): low confidence
- The system SHALL display the ownership conclusion prominently (our team / not our team)
- The system SHALL display the owning team name
- The system SHALL display arguments for ownership as a bulleted list
- The system SHALL display arguments against ownership as a bulleted list
- The system SHALL display related files as a list with:
  - File path (clickable link to GitHub)
  - Repository name
  - Explanation of why the file is relevant
- The system SHALL display a suggested team if the bug is not ours
- The system SHALL display the detailed analysis as rendered markdown
- The system SHALL show a real-time streaming log during analysis with:
  - Tool calls being made (e.g., "Searching code in santa-editor...")
  - Files being read
  - Progress indicators
- The system SHALL show a loading state while analysis is in progress
- The system SHALL handle and display errors if analysis fails, showing:
  - A visible error header and message
  - A hint to check the server terminal for detailed logs
  - A Retry button to re-run the analysis
- The system SHALL detect stale connections (no server events for 60 seconds) and display a timeout error
- The system SHALL detect connection drops (stream ended without result) and display a descriptive error

## Scenarios

### Scenario: Display a high-confidence report
Given a triage report with confidence 85% and isOurTeam false
When the report is rendered
Then the confidence badge SHALL be green and show "85%"
And the conclusion SHALL show "Not our team"
And the suggested team SHALL be visible

### Scenario: Display a low-confidence report
Given a triage report with confidence 35%
When the report is rendered
Then the confidence badge SHALL be red and show "35%"
And both argument lists SHALL be visible to show ambiguity

### Scenario: Display streaming progress
Given an analysis is in progress
When Claude makes a tool call to search code
Then the streaming log SHALL show "Searching code in <repo>..."
And a loading indicator SHALL be visible

### Scenario: Analysis error
Given the analysis fails due to an API error
When the error is received
Then the system SHALL display an error message with details
And the user SHALL be able to retry the analysis
