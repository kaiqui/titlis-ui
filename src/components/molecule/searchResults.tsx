import { Link } from 'react-router-dom';

export default function SearchResults({ results, hasSearched }: { results: any; hasSearched: boolean }) {
  if (!hasSearched) return null;
  if (results && results.length === 0) return <div className="blog-search-empty-msg">Nenhum resultado encontrado.</div>;

  return (
    <div className="blog-search-results-grid">
      {results?.map((post: any) => (
        <article key={post.item.id} className="blog-search-card-item">
          <p className="blog-search-card-title">{post.item.title}</p>
          <p className="blog-search-card-subtitle">{post.item.subtitle}</p>
          <p className="blog-search-card-preview">{post.item.previewText}</p>
          <div className="blog-search-card-link-wrapper">
            <Link to={`/blog/${post.item.slug}`}>Ler mais</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
