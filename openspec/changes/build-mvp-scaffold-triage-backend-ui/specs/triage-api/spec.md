## ADDED Requirements

### Requirement: Triage analysis endpoint
The server SHALL expose a `POST /api/triage` endpoint that accepts a JSON body with `ticketKey` (string), `ownedRepo` (string), and `relatedRepos` (string array). API tokens for Jira, GitHub, and Anthropic SHALL be read from server-side environment variables. The endpoint SHALL return a streaming SSE response.

#### Scenario: Start triage analysis
- **WHEN** a client sends `POST /api/triage` with a valid ticket key and owned repo
- **THEN** the server begins the agentic analysis loop and streams SSE events to the client

#### Scenario: Missing required fields
- **WHEN** a client sends `POST /api/triage` without a ticket key or owned repo
- **THEN** the server responds with HTTP 400 and an error message indicating which fields are missing

#### Scenario: Server missing environment variables
- **WHEN** the server starts without required environment variables (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, GITHUB_TOKEN, ANTHROPIC_API_KEY)
- **THEN** the server logs an error at startup listing the missing variables

### Requirement: Jira ticket fetching
The server SHALL fetch ticket details from Jira Cloud REST API using credentials from environment variables (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN). It SHALL retrieve the ticket summary, description, status, priority, labels, components, assignee, and comments.

#### Scenario: Fetch valid ticket
- **WHEN** the triage analysis requests ticket data for an existing Jira key
- **THEN** the server fetches and returns all ticket fields including comments

#### Scenario: Invalid ticket key
- **WHEN** the triage analysis requests a non-existent Jira ticket
- **THEN** the server streams an error event indicating the ticket was not found

#### Scenario: Jira authentication failure
- **WHEN** the server's Jira token is invalid or expired
- **THEN** the server streams an error event indicating authentication failed

### Requirement: GitHub code search
The server SHALL search code across the owned repository and related repositories using the GitHub REST API. It SHALL support keyword search and file content reading.

#### Scenario: Search code by keywords
- **WHEN** Claude's tool call requests a code search with specific keywords and repositories
- **THEN** the server searches GitHub and returns matching files with code snippets

#### Scenario: Read specific file
- **WHEN** Claude's tool call requests the contents of a specific file in a repository
- **THEN** the server fetches and returns the file contents from GitHub

#### Scenario: GitHub rate limiting
- **WHEN** the GitHub API returns a rate limit error
- **THEN** the server retries with exponential backoff up to 3 attempts

### Requirement: Claude agentic analysis loop
The server SHALL use the Anthropic SDK to run an agentic analysis loop. Claude SHALL be provided with tools for Jira fetching, code search, and file reading. The loop SHALL allow 5-15 autonomous tool calls.

#### Scenario: Successful analysis
- **WHEN** Claude completes its analysis within the tool call limit
- **THEN** the server produces a structured report with ownership conclusion, confidence score (0-100%), arguments for/against, related files, and suggested owning team

#### Scenario: Tool call limit reached
- **WHEN** Claude reaches the maximum number of tool calls
- **THEN** the analysis completes with whatever information has been gathered so far

### Requirement: SSE streaming events
The server SHALL stream progress events during analysis using Server-Sent Events. Event types SHALL include: `status` (current step), `tool_call` (tool being invoked), `tool_result` (tool response summary), `report` (final structured report), `error` (failure details), and `done` (analysis complete with session ID).

#### Scenario: Stream progress events
- **WHEN** the triage analysis is running
- **THEN** the client receives SSE events for each major step: ticket fetch, each code search, each file read, and the final report

#### Scenario: Client disconnects mid-analysis
- **WHEN** the client closes the SSE connection before analysis completes
- **THEN** the server aborts the analysis and cleans up resources

### Requirement: Follow-up chat endpoint
The server SHALL expose a `POST /api/chat` endpoint that accepts a session ID and user message. It SHALL continue the Claude conversation with full context preserved from the triage analysis.

#### Scenario: Send follow-up message
- **WHEN** a client sends a message with a valid session ID
- **THEN** Claude responds with access to the full prior conversation context and tools

#### Scenario: Expired session
- **WHEN** a client sends a message with a session ID that has expired (>30 min inactivity)
- **THEN** the server responds with HTTP 410 Gone and a message indicating the session has expired

### Requirement: Session management
The server SHALL maintain in-memory sessions keyed by a unique session ID. Each session SHALL store the Claude conversation history and tool context. Sessions SHALL expire after 30 minutes of inactivity.

#### Scenario: Session created after analysis
- **WHEN** a triage analysis completes successfully
- **THEN** a new session is created and its ID is sent to the client in the `done` SSE event

#### Scenario: Session cleanup
- **WHEN** a session has been inactive for more than 30 minutes
- **THEN** the session is removed from memory on the next cleanup cycle
