import { Link } from 'react-router-dom';

export default function EmptyState({ title, message, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">⌘</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {actionLabel && actionTo && (
        <Link className="btn btn--primary" to={actionTo}>{actionLabel}</Link>
      )}
    </div>
  );
}
