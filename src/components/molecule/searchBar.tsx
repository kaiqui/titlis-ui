import { useState } from 'react';

export default function SearchBar({ onSearch, isLoading }: { onSearch: (term: string) => void; isLoading: boolean }) {
  const [localTerm, setLocalTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localTerm.trim()) onSearch(localTerm);
  };

  const handleClear = () => setLocalTerm('');

  return (
    <form onSubmit={handleSubmit} className="blog-search-form-container">
      <div className="blog-search-input-wrapper">
        <input type="text" value={localTerm} onChange={(e) => setLocalTerm(e.target.value)}
          placeholder="Digite aqui" className="blog-search-input-field" />
        {localTerm && (
          <button type="button" onClick={handleClear} className="blog-search-clear-btn" aria-label="Limpar busca">Limpar</button>
        )}
      </div>
      <button type="submit" disabled={isLoading} className="blog-search-submit-btn">
        {isLoading ? '...' : 'Buscar'}
      </button>
    </form>
  );
}
