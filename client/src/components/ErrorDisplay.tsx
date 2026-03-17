interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="error-display">
      <div className="error-header">Analysis Error</div>
      <p className="error-message">{message}</p>
      <p className="error-hint">Check the server terminal (where you ran <code>npm run dev</code>) for detailed logs.</p>
      <button onClick={onRetry}>Retry Analysis</button>
    </div>
  );
}
