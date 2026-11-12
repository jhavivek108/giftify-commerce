import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'newest', label: 'Newest' },
];

const PRICE_PRESETS = [
  { label: 'Any price', min: '', max: '' },
  { label: 'Under ₹100', min: '', max: '100' },
  { label: '₹100 – ₹300', min: '100', max: '300' },
  { label: 'Over ₹300', min: '300', max: '' },
];

/**
 * Filter panel for the shop. `filters` = { minPrice, maxPrice, available, featured };
 * the category is part of the URL path, so it is rendered as links.
 */
export default function ProductFilters({ categories, activeCategory, filters, onChange, onReset, queryString = '' }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const suffix = queryString ? `?${queryString}` : '';

  return (
    <div className="space-y-7">
      <section>
        <h3 className="eyebrow mb-3 text-muted">Category</h3>
        <ul className="space-y-1">
          <li>
            <Link to={`/shop${suffix}`} className={`block rounded-2xl px-4 py-2 font-medium ${!activeCategory ? 'bg-olive text-white' : 'hover:bg-white'}`}>
              All products
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c._id}>
              <Link to={`/shop/${c.slug}${suffix}`} className={`flex items-center justify-between rounded-2xl px-4 py-2 font-medium ${activeCategory === c.slug ? 'bg-olive text-white' : 'hover:bg-white'}`}>
                {c.name}
                <span className="text-sm opacity-70">{c.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="eyebrow mb-3 text-muted">Price</h3>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => {
            const active = (filters.minPrice || '') === p.min && (filters.maxPrice || '') === p.max;
            return (
              <button key={p.label} type="button" aria-pressed={active} onClick={() => set({ minPrice: p.min, maxPrice: p.max })} className="chip px-3.5 py-2 text-sm">
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Min (₹)
            <input type="number" min="0" inputMode="numeric" className="input mt-1" value={filters.minPrice || ''} onChange={(e) => set({ minPrice: e.target.value })} placeholder="0" />
          </label>
          <label className="text-sm font-medium">
            Max (₹)
            <input type="number" min="0" inputMode="numeric" className="input mt-1" value={filters.maxPrice || ''} onChange={(e) => set({ maxPrice: e.target.value })} placeholder="Any" />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="eyebrow mb-1 text-muted">Show</h3>
        <label className="flex cursor-pointer items-center gap-3 font-medium">
          <input type="checkbox" className="h-5 w-5 accent-[#333D25]" checked={Boolean(filters.available)} onChange={(e) => set({ available: e.target.checked })} />
          Available now
        </label>
        <label className="flex cursor-pointer items-center gap-3 font-medium">
          <input type="checkbox" className="h-5 w-5 accent-[#333D25]" checked={Boolean(filters.featured)} onChange={(e) => set({ featured: e.target.checked })} />
          Featured only
        </label>
      </section>

      <button type="button" onClick={onReset} className="btn btn-outline btn-sm w-full">
        <RotateCcw size={15} /> Clear filters
      </button>
    </div>
  );
}
