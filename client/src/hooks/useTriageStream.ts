import { useState, useCallback, useRef } from "react";
import type { TriageReport } from "../../../shared/src/index";

export interface StreamEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface TriageStreamState {
  isLoading: boolean;
  events: StreamEvent[];
  report: TriageReport | null;
  sessionId: string | null;
  error: string | null;
}

// Timeout: if no SSE events arrive within 60s, assume something is wrong
const STALE_TIMEOUT_MS = 60 * 1000;

export function useTriageStream() {
  const [state, setState] = useState<TriageStreamState>({
    isLoading: false,
    events: [],
    report: null,
    sessionId: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetStaleTimer() {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (!prev.isLoading) return prev;
        return {
          ...prev,
          isLoading: false,
          error: "No response from server for 60 seconds. The analysis may have stalled. Check the server terminal for details.",
        };
      });
    }, STALE_TIMEOUT_MS);
  }

  function clearStaleTimer() {
    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
      staleTimerRef.current = null;
    }
  }

  const startAnalysis = useCallback(
    async (ticketKey: string, ownedRepo: string, relatedRepos: string[]) => {
      // Reset state
      setState({
        isLoading: true,
        events: [],
        report: null,
        sessionId: null,
        error: null,
      });

      abortRef.current = new AbortController();
      resetStaleTimer();

      try {
        const response = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketKey, ownedRepo, relatedRepos }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          clearStaleTimer();
          let errMsg = `HTTP ${response.status}`;
          try {
            const err = await response.json();
            errMsg = err.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Reset stale timer on every chunk
          resetStaleTimer();

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const dataLine = line.replace(/^data: /, "");
            if (!dataLine) continue;

            try {
              const event: StreamEvent = JSON.parse(dataLine);
              setState((prev) => {
                const next = { ...prev, events: [...prev.events, event] };

                if (event.type === "report") {
                  next.report = event.data;
                } else if (event.type === "done") {
                  next.sessionId = event.data.sessionId;
                  next.isLoading = false;
                } else if (event.type === "error") {
                  next.error = event.data.message;
                  next.isLoading = false;
                }

                return next;
              });
            } catch {
              // skip malformed events
            }
          }
        }

        clearStaleTimer();

        // Stream ended — ensure loading stops
        setState((prev) => {
          if (!prev.isLoading) return prev;
          // If we never got a "done" or "error" event, that's a problem
          if (!prev.report && !prev.error) {
            return {
              ...prev,
              isLoading: false,
              error: "Connection closed without a result. Check the server terminal for errors.",
            };
          }
          return { ...prev, isLoading: false };
        });
      } catch (err: any) {
        clearStaleTimer();
        if (err.name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err.message,
          }));
        }
      }
    },
    []
  );

  const abort = useCallback(() => {
    clearStaleTimer();
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  return { ...state, startAnalysis, abort };
}
