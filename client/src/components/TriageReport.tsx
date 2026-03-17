import type { TriageReport as Report } from "../../../shared/src/index";

interface TriageReportProps {
  report: Report;
}

function confidenceColor(confidence: number): string {
  if (confidence > 70) return "#22c55e";
  if (confidence >= 40) return "#eab308";
  return "#ef4444";
}

function confidenceLabel(confidence: number): string {
  if (confidence > 70) return "High";
  if (confidence >= 40) return "Medium";
  return "Low";
}

export default function TriageReport({ report }: TriageReportProps) {
  const color = confidenceColor(report.confidence);

  return (
    <div className="triage-report">
      <div className="report-header">
        <h2>{report.ticketKey}</h2>
        <span
          className="confidence-badge"
          style={{ backgroundColor: color }}
        >
          {report.confidence}% — {confidenceLabel(report.confidence)}
        </span>
      </div>

      {report.ticketSummary && (
        <p className="ticket-summary">{report.ticketSummary}</p>
      )}

      <div className="ownership-conclusion">
        <strong>Ownership:</strong>{" "}
        {report.isOwnedByTeam
          ? `Belongs to your team (${report.owningTeam})`
          : `Likely belongs to ${report.owningTeam}`}
      </div>

      {report.suggestedTeam && (
        <div className="suggested-team">
          <strong>Suggested team:</strong> {report.suggestedTeam}
        </div>
      )}

      {report.argumentsFor.length > 0 && (
        <div className="arguments-section">
          <h3>Arguments For Ownership</h3>
          <ul>
            {report.argumentsFor.map((arg, i) => (
              <li key={i}>{arg}</li>
            ))}
          </ul>
        </div>
      )}

      {report.argumentsAgainst.length > 0 && (
        <div className="arguments-section">
          <h3>Arguments Against Ownership</h3>
          <ul>
            {report.argumentsAgainst.map((arg, i) => (
              <li key={i}>{arg}</li>
            ))}
          </ul>
        </div>
      )}

      {report.relatedFiles.length > 0 && (
        <div className="related-files">
          <h3>Related Files</h3>
          <ul>
            {report.relatedFiles.map((file, i) => (
              <li key={i}>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.repo}/{file.path}
                </a>
                {file.relevance && (
                  <span className="file-relevance"> — {file.relevance}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.analysis && (
        <div className="analysis-detail">
          <h3>Detailed Analysis</h3>
          <p>{report.analysis}</p>
        </div>
      )}
    </div>
  );
}
