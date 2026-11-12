import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import { productApi } from '../services/api';
import { displayPrice, productImage } from '../utils/format';

/** Search field with live suggestions. Enter opens the shop page with the full results. */
export default function SearchBar({ onClose, autoFocus = true }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(term.trim(), 300);
  const input = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    productApi
      .list({ search: debounced, limit: 6 })
      .then((data) => alive && setResults(data.items || []))
      .catch(() => alive && setResults([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced]);

  const submit = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(term.trim())}`);
    onClose?.();
  };

  return (
    <div>
      <form onSubmit={submit} role="search" className="flex items-center gap-3 rounded-full border-[1.5px] border-line bg-white px-5 py-3">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          ref={input}
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search keychains, clips, blooms…"
          aria-label="Search products"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted/70"
        />
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-1 hover:bg-line">
            <X size={18} />
          </button>
        )}
      </form>

      {debounced.length >= 2 && (
        <div className="mt-3 rounded-3xl bg-white p-2 shadow-soft">
          {loading && <p className="px-4 py-3 text-sm text-muted">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-sm text-muted">No products match “{debounced}”.</p>}
          {results.map((p) => (
            <Link key={p._id} to={`/product/${p.slug}`} onClick={onClose} className="flex items-center gap-4 rounded-2xl px-3 py-2 hover:bg-cream">
              <img src={productImage(p)} alt="" className="h-12 w-12 object-contain" loading="lazy" />
              <span className="flex-1">
                <span className="block font-bold">{p.name}</span>
                <span className="text-sm text-muted">{p.category?.name}</span>
              </span>
              <span className="text-sm font-bold">{displayPrice(p)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
