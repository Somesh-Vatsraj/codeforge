export default function Spinner({ label = 'Loading…', compact = false }) {
  return (
    <div className={compact ? 'spinner spinner--compact' : 'spinner'} role="status" aria-live="polite">
      <span className="spinner__dot" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  );
}
