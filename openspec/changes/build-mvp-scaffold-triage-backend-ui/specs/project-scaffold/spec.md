## ADDED Requirements

### Requirement: TypeScript monorepo structure
The project SHALL use a monorepo structure with three top-level directories: `client/` (React frontend), `server/` (Express backend), and `shared/` (shared TypeScript types and constants). All code SHALL be written in TypeScript.

#### Scenario: Fresh clone and setup
- **WHEN** a developer clones the repository and runs `npm install`
- **THEN** all dependencies for client, server, and shared packages are installed

#### Scenario: Shared types are accessible
- **WHEN** the server or client imports from the shared package
- **THEN** TypeScript types and constants are available without a separate build step

### Requirement: Development server with hot reload
The project SHALL provide a development mode that runs the frontend dev server (Vite) and backend server concurrently with hot reload for both.

#### Scenario: Start development environment
- **WHEN** a developer runs `npm run dev`
- **THEN** the Vite dev server starts on port 5173 and the Express server starts on port 3000, both watching for file changes

#### Scenario: Frontend proxies API calls to backend
- **WHEN** the Vite dev server receives a request to `/api/*`
- **THEN** it proxies the request to the Express backend on port 3000

### Requirement: Production build
The project SHALL support a single production build that outputs a deployable Node.js application serving both the API and static frontend assets.

#### Scenario: Build for production
- **WHEN** a developer runs `npm run build`
- **THEN** the client is built to `client/dist/`, the server is compiled to `server/dist/`, and shared types are compiled

#### Scenario: Run production server
- **WHEN** a developer runs `npm start`
- **THEN** the Express server starts, serves the API at `/api/*`, and serves the built frontend assets for all other routes

### Requirement: Project configuration files
The project SHALL include standard configuration files for TypeScript, ESLint, and package management.

#### Scenario: TypeScript strict mode
- **WHEN** TypeScript compiles the project
- **THEN** strict mode is enabled for all packages

#### Scenario: Package scripts are defined
- **WHEN** a developer inspects the root `package.json`
- **THEN** scripts for `dev`, `build`, `start`, and `lint` are available
