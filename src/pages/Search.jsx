import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import PostCard from '../components/PostCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Seo from '../components/Seo.jsx';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [input, setInput] = useState(query);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setInput(query); }, [query]);

  useEffect(() => {
    if (!query) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    api.get(`/search${qs({ q: query, page })}`)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData({ posts: [], total: 0, page: 1, pages: 0 }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, page]);

  const submit = (event) => {
    event.preventDefault();
    const next = input.trim();
    if (next) setSearchParams({ q: next });
  };

  return (
    <div className="container section">
      <Seo
        title={query ? `Search: ${query}` : 'Search'}
        description="Search tutorials, projects, categories and tags."
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Search</span>
      </nav>

      <header className="page-head">
        <h1>Search</h1>
        <form className="search-page-form" onSubmit={submit} role="search">
          <label className="sr-only" htmlFor="search-input">Search tutorials</label>
          <input
            id="search-input"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by title, description, category or tag…"
            autoFocus
          />
          <button type="submit" className="btn btn--primary">Search</button>
        </form>
      </header>

      {loading && <Spinner label="Searching…" />}

      {!loading && data && (
        <>
          <p className="muted" role="status">
            {data.total} {data.total === 1 ? 'result' : 'results'} for “{data.query}”
          </p>

          {data.posts.length === 0 ? (
            <EmptyState
              title="No results found"
              message="Try different keywords, or browse the categories."
              actionLabel="Browse latest"
              actionTo="/latest"
            />
          ) : (
            <>
              <div className="post-grid">
                {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
              <Pagination
                page={data.page}
                pages={data.pages}
                buildTo={(n) => (n === 1 ? `/search?q=${encodeURIComponent(query)}` : `/search?q=${encodeURIComponent(query)}&page=${n}`)}
              />
            </>
          )}
        </>
      )}

      {!loading && !data && (
        <EmptyState title="Start typing" message="Search across every tutorial, project, category and tag." />
      )}
    </div>
  );
}
