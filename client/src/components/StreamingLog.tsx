import type { StreamEvent } from "../hooks/useTriageStream";

interface StreamingLogProps {
  events: StreamEvent[];
  isLoading: boolean;
}

function formatEvent(event: StreamEvent): string {
  switch (event.type) {
    case "status":
      return event.data.message;
    case "tool_call":
      return `Calling ${event.data.tool}(${summarizeInput(event.data.input)})`;
    case "tool_result":
      return `${event.data.tool}: ${event.data.summary}`;
    case "error":
      return `Error: ${event.data.message}`;
    case "done":
      return "Analysis complete";
    default:
      return `${event.type}: ${JSON.stringify(event.data)}`;
  }
}

function summarizeInput(input: Record<string, unknown>): string {
  const parts = Object.entries(input).map(([k, v]) => {
    const val = typeof v === "string" ? v : JSON.stringify(v);
    const short = val.length > 50 ? val.slice(0, 47) + "..." : val;
    return `${k}=${short}`;
  });
  return parts.join(", ");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

export default function StreamingLog({ events, isLoading }: StreamingLogProps) {
  // Don't show report events in the log — they go to the report component
  const logEvents = events.filter((e) => e.type !== "report");

  if (logEvents.length === 0 && !isLoading) return null;

  return (
    <div className="streaming-log">
      <h3>Analysis Log {isLoading && <span className="spinner" />}</h3>
      <div className="log-entries">
        {logEvents.map((event, i) => (
          <div key={i} className={`log-entry log-${event.type}`}>
            <span className="log-time">{formatTime(event.timestamp)}</span>
            <span className="log-message">{formatEvent(event)}</span>
          </div>
        ))}
        {isLoading && (
          <div className="log-entry log-status">
            <span className="log-time" />
            <span className="log-message thinking">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
