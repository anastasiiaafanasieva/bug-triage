# Code Search

## Purpose

Provides the ability to search code across multiple GitHub repositories and read file contents. This is how the triage analysis finds relevant source files, traces error paths, and identifies which team's code is involved in a bug.

## Requirements

- The system SHALL use the Octocode MCP server (Webrix/octocode) for all code search operations, NOT GitHub API or Octokit
- The system SHALL NOT use GitHub REST API or Octokit directly
- The system SHALL search code within a specified repository using keyword queries via MCP
- The system SHALL return matching file paths and code snippets from search results
- The system SHALL retrieve the full content of a specific file given repo, path, and optional branch/ref via MCP
- The system SHALL list directory contents to explore repository structure via MCP
- The system SHALL support searching across any repository accessible through the MCP server
- The system SHALL handle MCP server connection errors gracefully with a clear error message

## Scenarios

### Scenario: Search for a keyword in a repository
Given the Octocode MCP server is available
And a repository "wix-private/santa-editor"
And a search query "SectionName"
When the system searches for code via MCP
Then it SHALL return a list of matching files with paths and code snippets

### Scenario: Read a specific file
Given the Octocode MCP server is available
And a repository "wix-private/santa-editor"
And a file path "packages/sections/scope.ts"
When the system reads the file content via MCP
Then it SHALL return the full file content as a string

### Scenario: Explore repository structure
Given the Octocode MCP server is available
And a repository "wix-private/santa-editor"
And a directory path "packages/sections"
When the system lists directory contents via MCP
Then it SHALL return a list of files and subdirectories in that path

### Scenario: No search results
Given the Octocode MCP server is available
And a search query that matches no code in the specified repository
When the system searches for code via MCP
Then it SHALL return an empty results list (not an error)

### Scenario: MCP server unavailable
When the Octocode MCP server is not reachable
And the system attempts to search code
Then it SHALL return a connection error with a message indicating the MCP server is unavailable
