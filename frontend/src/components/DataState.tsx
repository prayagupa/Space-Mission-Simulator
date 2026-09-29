import Icon from "./Icon";

export default function DataState({ error, message = "Receiving mission data...", onRetry }: { error?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className={`empty-state ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>
      {error ? <Icon name="signal" size={28} /> : <span className="loading-orbit" />}
      <p>{error || message}</p>
      {error && onRetry && <button className="btn btn-secondary btn-small" onClick={onRetry}><Icon name="refresh" size={15} />Try again</button>}
    </div>
  );
}
