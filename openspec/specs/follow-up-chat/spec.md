# Follow-Up Chat

## Purpose

After the initial triage report, allows the user to have a conversation about the analysis. The server retains the analysis context (prompt + Claude's response) and passes it as context to subsequent Claude CLI invocations. This enables deeper investigation without starting from scratch.

## Requirements

- The system SHALL display a chat panel after the initial triage report is complete
- The system SHALL accept free-text messages from the user
- The system SHALL send follow-up messages via the Claude CLI (`claude -p`), including the full conversation history as context
- The system SHALL NOT use the Anthropic SDK or require an Anthropic API key for follow-up chat
- The system SHALL stream Claude's follow-up responses back to the frontend
- The system SHALL render Claude's responses as markdown (code blocks, lists, etc.)
- The system SHALL maintain the session on the server with full message history
- The system SHALL expire sessions after 30 minutes of inactivity
- The system SHALL display a message when the session has expired
- The system SHALL allow the user to start a new analysis after session expiry

## Scenarios

### Scenario: Ask a follow-up question
Given a completed triage report with sessionId
When the user types "Can you explain the ownership reasoning in more detail?"
Then the system SHALL send the message to the backend with the sessionId
And the server SHALL invoke the Claude CLI with the conversation context
And the response SHALL appear in the chat panel

### Scenario: Multiple follow-up messages
Given a completed triage report
When the user sends 3 follow-up messages
Then each response SHALL have access to the full conversation history
And Claude SHALL reference earlier findings in later responses

### Scenario: Session expired
Given a session that has been inactive for 31 minutes
When the user sends a follow-up message
Then the system SHALL display "Session expired. Start a new analysis to continue."
And the chat input SHALL be disabled
And a "New Analysis" button SHALL be visible
