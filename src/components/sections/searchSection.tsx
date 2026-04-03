import { useMemo, useState } from 'react';
import { fuseOptions } from '@/utils/search-utils';
import SearchBar from '@/components/molecule/searchBar';
import SearchResults from '@/components/molecule/searchResults';
import Fuse from 'fuse.js';
import { Title } from '@/components/atoms/typography';

export default function SearchSection({ posts }: Readonly<{ posts: any[] }>) {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fuse = useMemo(() => new Fuse(posts, fuseOptions), [posts]);

  const handleSearch = (term: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      if (!term.trim()) { setResults([]); return; }
      setResults(fuse.search(term));
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const titleData = {
    title: 'Pesquisa Blog',
    titleColor: { hex: '#FF542B' },
    titleFont: { fontfamily: ['family-neighbor'], fontsize: ['3rem'], fontweight: ['bold'] },
    titleHtmlTag: { tag: ['H1'] },
  };

  return (
    <div className="blog-search-section-wrapper">
      <Title data={titleData} />
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      <SearchResults results={results} hasSearched={hasSearched} />
    </div>
  );
}
