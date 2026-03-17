import { useState, type FormEvent } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface TriageFormProps {
  onSubmit: (ticketKey: string, ownedRepo: string, relatedRepos: string[]) => void;
  disabled: boolean;
}

/** Extract ticket key from a full Jira URL or return as-is */
function extractTicketKey(input: string): string {
  const trimmed = input.trim();
  // Match URLs like https://org.atlassian.net/browse/EDIT-12345
  const urlMatch = trimmed.match(/\/browse\/([A-Z][\w]+-\d+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Already a ticket key
  return trimmed.toUpperCase();
}

export default function TriageForm({ onSubmit, disabled }: TriageFormProps) {
  const [ticketInput, setTicketInput] = useState("");
  const [ownedRepo, setOwnedRepo] = useLocalStorage("ownedRepo", "");
  const [relatedReposStr, setRelatedReposStr] = useLocalStorage("relatedRepos", "");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!ticketInput.trim()) {
      setError("Please enter a Jira ticket key or URL");
      return;
    }
    if (!ownedRepo.trim()) {
      setError("Please enter your owned project/repository");
      return;
    }

    const ticketKey = extractTicketKey(ticketInput);
    const relatedRepos = relatedReposStr
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    onSubmit(ticketKey, ownedRepo.trim(), relatedRepos);
  }

  return (
    <form className="triage-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="ticket">Jira Ticket</label>
        <input
          id="ticket"
          type="text"
          placeholder="EDIT-12345 or https://org.atlassian.net/browse/EDIT-12345"
          value={ticketInput}
          onChange={(e) => setTicketInput(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="form-field">
        <label htmlFor="ownedRepo">Owned Project</label>
        <input
          id="ownedRepo"
          type="text"
          placeholder="org/repo-name"
          value={ownedRepo}
          onChange={(e) => setOwnedRepo(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="form-field">
        <label htmlFor="relatedRepos">Related Projects</label>
        <input
          id="relatedRepos"
          type="text"
          placeholder="org/repo1, org/repo2 (comma-separated)"
          value={relatedReposStr}
          onChange={(e) => setRelatedReposStr(e.target.value)}
          disabled={disabled}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" disabled={disabled}>
        {disabled ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
