import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import ProductFilters, { SORT_OPTIONS } from '../components/ProductFilters';
import { EmptyState, ErrorMessage, LoadingSpinner, Modal } from '../components/ui';
import useAsync from '../hooks/useAsync';
import useCategories from '../hooks/useCategories';
import useDebounce from '../hooks/useDebounce';
import { productApi } from '../services/api';
import { themeOf } from '../utils/themes';
import { imageUrl } from '../utils/format';

const PAGE_SIZE = 24;

export default function Shop() {
  const { categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const { categories } = useCategories();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(searchText.trim(), 350);

  const category = categories.find((c) => c.slug === categorySlug);
  const filters = {
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    available: params.get('available') === 'true',
    featured: params.get('featured') === 'true',
  };
  const sort = params.get('sort') || 'featured';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') || '';

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, val]) => {
      if (val === '' || val === false || val === undefined || val === null) next.delete(key);
      else next.set(key, String(val));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Keep the URL in step with the search box (debounced), and the box in step with the URL.
  useEffect(() => {
    if (debouncedSearch !== search) update({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  useEffect(() => {
    setSearchText(search);
  }, [search]);

  const query = useMemo(
    () => ({ category: categorySlug, search, ...filters, sort, page, limit: PAGE_SIZE }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorySlug, search, filters.minPrice, filters.maxPrice, filters.available, filters.featured, sort, page]
  );
  const { data, loading, error, reload } = useAsync(() => productApi.list(query), [query]);

  const theme = themeOf(category?.theme);
  const keepQuery = new URLSearchParams(params);
  keepQuery.delete('page');

  const filterPanel = (
    <ProductFilters
      categories={categories}
      activeCategory={categorySlug}
      filters={filters}
      queryString={keepQuery.toString()}
      onChange={(next) => update(next)}
      onReset={() => {
        setSearchText('');
        setParams({}, { replace: true });
      }}
    />
  );

  return (
    <div className="container-page pb-6 pt-6 sm:pt-10">
      <header className="relative overflow-hidden rounded-[32px] px-7 py-10 sm:px-12 sm:py-14" style={category ? { background: theme.bg, color: theme.ink } : { background: '#fff' }}>
        <nav className="text-sm font-medium opacity-80" aria-label="Breadcrumb">
          <Link to="/" className="hover:underline">
            Home
          </Link>{' '}
          /{' '}
          <Link to="/shop" className="hover:underline">
            Shop
          </Link>
          {category && <> / {category.name}</>}
        </nav>
        <h1 className="mt-3 max-w-[14ch] text-4xl sm:text-6xl">{category ? category.name : 'Shop everything'}</h1>
        <p className="mt-3 max-w-md leading-relaxed sm:max-w-lg">
          {category ? category.description : 'Every handmade design in one place. Filter by collection or price, or search for a favourite.'}
        </p>
        {category?.image && <img src={imageUrl(category.image)} alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-8 hidden max-h-[88%] max-w-[26%] object-contain drop-shadow-[0_14px_14px_rgba(0,0,0,0.18)] md:block" />}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[270px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <label className="flex min-w-52 flex-1 items-center gap-3 rounded-full border-[1.5px] border-line bg-white px-5 py-2.5">
              <Search size={17} className="text-muted" />
              <span className="sr-only">Search products</span>
              <input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search products" className="w-full bg-transparent outline-none placeholder:text-muted/70" />
            </label>
            <button className="btn btn-outline btn-sm lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={15} /> Filters
            </button>
            <label className="flex items-center gap-2 text-sm font-medium">
              <span className="hidden sm:inline">Sort by</span>
              <select className="input w-auto rounded-full py-2.5" value={sort} onChange={(e) => update({ sort: e.target.value === 'featured' ? '' : e.target.value })} aria-label="Sort products">
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading && !data ? (
            <LoadingSpinner label="Loading products…" />
          ) : error ? (
            <ErrorMessage error={error} onRetry={reload} />
          ) : data.items.length === 0 ? (
            <EmptyState title="Nothing matches those filters">Try clearing a filter or searching for something else.</EmptyState>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted" aria-live="polite">
                Showing {data.items.length} of {data.total} {data.total === 1 ? 'product' : 'products'}
                {search ? ` for “${search}”` : ''}
              </p>
              <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <ProductGrid products={data.items} columns={3} />
              </div>
              {data.pages > 1 && (
                <nav className="mt-10 flex justify-center gap-2" aria-label="Pages">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => update({ page: n === 1 ? '' : n })} aria-current={n === page ? 'page' : undefined} className={`chip h-11 w-11 justify-center p-0 ${n === page ? 'is-active' : ''}`}>
                      {n}
                    </button>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        {filterPanel}
        <button className="btn btn-primary mt-6 w-full" onClick={() => setFiltersOpen(false)}>
          Show results
        </button>
      </Modal>
    </div>
  );
}
