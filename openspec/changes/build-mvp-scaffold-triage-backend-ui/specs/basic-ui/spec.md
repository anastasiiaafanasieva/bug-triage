## ADDED Requirements

### Requirement: Ticket input form
The UI SHALL display an input field for entering a Jira ticket link or key (e.g., "https://jira.example.com/browse/EDIT-12345" or "EDIT-12345"), an input for the owned project/repository, an input for related projects/repositories to search, and an Analyze button. Project inputs SHALL be persisted in browser localStorage so the user only enters them once.

#### Scenario: Submit ticket for analysis
- **WHEN** a user enters a valid ticket link/key with at least the owned project filled in and clicks Analyze
- **THEN** the UI sends a triage request to the backend and transitions to the analysis view

#### Scenario: Empty ticket field
- **WHEN** a user clicks Analyze with an empty ticket field
- **THEN** the UI shows a validation error and does not send a request

#### Scenario: Returning user auto-loads project settings
- **WHEN** a user opens the app with previously saved project settings
- **THEN** the owned project and related projects fields are pre-filled from localStorage

#### Scenario: Parse ticket key from full URL
- **WHEN** a user pastes a full Jira URL like "https://jira.example.com/browse/EDIT-12345"
- **THEN** the UI extracts the ticket key "EDIT-12345" for the API request

### Requirement: Real-time streaming analysis display
The UI SHALL display a streaming log of the triage analysis progress, showing each step as it happens (ticket fetch, code searches, file reads, AI reasoning).

#### Scenario: Show streaming progress
- **WHEN** the backend streams SSE events during analysis
- **THEN** the UI appends each event to a visible streaming log with timestamps and descriptions

#### Scenario: Show loading state
- **WHEN** analysis is in progress
- **THEN** the UI shows a loading indicator and disables the submit button

### Requirement: Triage report display
The UI SHALL render the completed triage report with: ticket summary, confidence badge (color-coded: green >70%, yellow 40-70%, red <40%), ownership conclusion, owning team, arguments for and against ownership, related source files as clickable GitHub links, and suggested team if not owned by user's team.

#### Scenario: Display high-confidence report
- **WHEN** the analysis completes with confidence >70%
- **THEN** the report shows a green confidence badge and the full structured report

#### Scenario: Display low-confidence report
- **WHEN** the analysis completes with confidence <40%
- **THEN** the report shows a red confidence badge and the full structured report

#### Scenario: Analysis error
- **WHEN** the analysis fails with an error
- **THEN** the UI displays the error message and a Retry button

### Requirement: Follow-up chat interface
The UI SHALL display a chat interface below the triage report, allowing users to send follow-up messages. Responses SHALL be streamed in real-time.

#### Scenario: Send follow-up question
- **WHEN** a user types a message and sends it after a completed analysis
- **THEN** the message appears in the chat, and Claude's streaming response is displayed below it

#### Scenario: Multiple follow-up messages
- **WHEN** a user sends multiple follow-up messages
- **THEN** all messages and responses are displayed in chronological order with full context preserved

#### Scenario: Session expired
- **WHEN** a user tries to send a follow-up message after session expiry
- **THEN** the UI shows a message indicating the session has expired and offers to start a new analysis

### Requirement: Simple single-page layout
The UI SHALL use a simple single-column layout optimized for desktop. The main page shows the ticket input form at the top, followed by the streaming log and report below.

#### Scenario: Desktop layout
- **WHEN** a user views the app on a desktop screen
- **THEN** the content is centered with a maximum width of 900px and comfortable reading margins
