import { useRef } from "react";
import TriageForm from "./components/TriageForm";
import StreamingLog from "./components/StreamingLog";
import TriageReport from "./components/TriageReport";
import FollowUpChat from "./components/FollowUpChat";
import ErrorDisplay from "./components/ErrorDisplay";
import { useTriageStream } from "./hooks/useTriageStream";

export default function App() {
  const { isLoading, events, report, sessionId, error, startAnalysis } =
    useTriageStream();

  // Keep last submit args for retry
  const lastArgs = useRef<{
    ticketKey: string;
    ownedRepo: string;
    relatedRepos: string[];
  } | null>(null);

  function handleSubmit(
    ticketKey: string,
    ownedRepo: string,
    relatedRepos: string[]
  ) {
    lastArgs.current = { ticketKey, ownedRepo, relatedRepos };
    startAnalysis(ticketKey, ownedRepo, relatedRepos);
  }

  function handleRetry() {
    if (lastArgs.current) {
      const { ticketKey, ownedRepo, relatedRepos } = lastArgs.current;
      startAnalysis(ticketKey, ownedRepo, relatedRepos);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bug Triage Tool</h1>
      </header>

      <main className="app-main">
        <TriageForm onSubmit={handleSubmit} disabled={isLoading} />

        <StreamingLog events={events} isLoading={isLoading} />

        {error && !isLoading && (
          <ErrorDisplay message={error} onRetry={handleRetry} />
        )}

        {report && <TriageReport report={report} />}

        {sessionId && <FollowUpChat sessionId={sessionId} />}
      </main>
    </div>
  );
}
