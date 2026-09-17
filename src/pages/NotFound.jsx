import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';

export default function NotFound() {
  return (
    <div className="container section not-found">
      <Seo title="404 — Page not found" description="The page you are looking for does not exist." />
      <p className="not-found__code">404</p>
      <h1>Page not found</h1>
      <p className="muted">
        The page you are looking for was moved, removed, or never existed.
      </p>
      <div className="hero__actions">
        <Link className="btn btn--primary" to="/">Back to homepage</Link>
        <Link className="btn btn--ghost" to="/latest">Browse tutorials</Link>
      </div>
    </div>
  );
}
