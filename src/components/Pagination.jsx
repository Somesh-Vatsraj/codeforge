import { Link } from 'react-router-dom';

export default function Pagination({ page, pages, buildTo }) {
  if (!pages || pages <= 1) return null;

  const windowSize = 2;
  const numbers = [];
  const start = Math.max(1, page - windowSize);
  const end = Math.min(pages, page + windowSize);

  for (let i = start; i <= end; i += 1) numbers.push(i);

  const to = (n) => (typeof buildTo === 'function' ? buildTo(n) : `?page=${n}`);

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && (
        <Link className="pagination__link" to={to(page - 1)} rel="prev">← Prev</Link>
      )}

      {start > 1 && (
        <>
          <Link className="pagination__link" to={to(1)}>1</Link>
          {start > 2 && <span className="pagination__gap">…</span>}
        </>
      )}

      {numbers.map((n) => (
        <Link
          key={n}
          to={to(n)}
          className={n === page ? 'pagination__link pagination__link--active' : 'pagination__link'}
          aria-current={n === page ? 'page' : undefined}
        >
          {n}
        </Link>
      ))}

      {end < pages && (
        <>
          {end < pages - 1 && <span className="pagination__gap">…</span>}
          <Link className="pagination__link" to={to(pages)}>{pages}</Link>
        </>
      )}

      {page < pages && (
        <Link className="pagination__link" to={to(page + 1)} rel="next">Next →</Link>
      )}
    </nav>
  );
}
