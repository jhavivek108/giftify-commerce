import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, ErrorMessage, LoadingSpinner, Modal } from '../../components/ui';
import useAsync from '../../hooks/useAsync';
import useCategories, { invalidateCategories } from '../../hooks/useCategories';
import useDebounce from '../../hooks/useDebounce';
import { productApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { displayPrice, fieldErrors, productImage } from '../../utils/format';
import { ImageListEditor, PageHeader, Table, td, Toggle } from './shared';

const blank = (categoryId = '') => ({
  name: '',
  description: '',
  category: categoryId,
  basePrice: '',
  priceUnit: 'each',
  stock: 20,
  isAvailable: true,
  isFeatured: false,
  customisable: true,
  images: [],
  colours: [],
  variants: [],
});

const toForm = (p) => ({
  name: p.name,
  description: p.description || '',
  category: p.category?._id || '',
  basePrice: p.basePrice,
  priceUnit: p.priceUnit || '',
  stock: p.stock ?? 0,
  isAvailable: p.isAvailable,
  isFeatured: p.isFeatured,
  customisable: p.customisable,
  images: (p.images || []).map(({ url, alt }) => ({ url, alt: alt || '' })),
  colours: (p.colours || []).map(({ name, hex }) => ({ name, hex: hex || '#FFFFFF' })),
  variants: (p.variants || []).map(({ _id, size, price, stock, isAvailable }) => ({ _id, size, price, stock, isAvailable: isAvailable !== false })),
});

const toBody = (form) => {
  const variants = form.variants
    .filter((v) => v.size.trim())
    .map((v) => ({ ...(v._id ? { _id: v._id } : {}), size: v.size.trim(), price: Number(v.price), stock: Number(v.stock) || 0, isAvailable: v.isAvailable }));
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    basePrice: variants.length ? Math.min(...variants.map((v) => v.price)) : Number(form.basePrice),
    priceUnit: form.priceUnit.trim() || 'each',
    stock: Number(form.stock) || 0,
    isAvailable: form.isAvailable,
    isFeatured: form.isFeatured,
    customisable: form.customisable,
    images: form.images.map((i) => ({ url: i.url, alt: i.alt || form.name.trim() })),
    colours: form.colours.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex })),
    variants,
  };
};

function ProductForm({ product, categories, onSaved }) {
  const { success } = useToast();
  const [form, setForm] = useState(() => (product ? toForm(product) : blank(categories[0]?._id)));
  const [state, setState] = useState({ saving: false, error: null });
  const errors = fieldErrors(state.error);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setRow = (key, index, patch) => set({ [key]: form[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const removeRow = (key, index) => set({ [key]: form[key].filter((_, i) => i !== index) });
  const hasVariants = form.variants.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setState({ saving: true, error: null });
    try {
      const body = toBody(form);
      if (product) await productApi.update(product._id, body);
      else await productApi.create(body);
      success(product ? 'Product updated' : 'Product added');
      invalidateCategories();
      onSaved();
    } catch (error) {
      setState({ saving: false, error });
    }
  };

  const err = (name) => errors[name] && <p className="field-error">{errors[name]}</p>;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-name">
            Product name
          </label>
          <input id="p-name" className="input" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
          {err('name')}
        </div>
        <div>
          <label className="label" htmlFor="p-category">
            Category
          </label>
          <select id="p-category" className="input" required value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {err('category')}
        </div>
        <div>
          <label className="label" htmlFor="p-unit">
            Sold as
          </label>
          <input id="p-unit" className="input" value={form.priceUnit} onChange={(e) => set({ priceUnit: e.target.value })} placeholder="each, set of 2, 2 pieces" />
        </div>
        <div>
          <label className="label" htmlFor="p-price">
            Price (₹)
          </label>
          <input id="p-price" className="input" type="number" min="0" step="1" required disabled={hasVariants} value={hasVariants ? '' : form.basePrice} placeholder={hasVariants ? 'Set by sizes below' : ''} onChange={(e) => set({ basePrice: e.target.value })} />
          {err('basePrice')}
        </div>
        <div>
          <label className="label" htmlFor="p-stock">
            Stock
          </label>
          <input id="p-stock" className="input" type="number" min="0" step="1" disabled={hasVariants} value={hasVariants ? '' : form.stock} placeholder={hasVariants ? 'Set by sizes below' : ''} onChange={(e) => set({ stock: e.target.value })} />
          {err('stock')}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-desc">
            Description
          </label>
          <textarea id="p-desc" className="input min-h-24" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          {err('description')}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Toggle label="Available to buy" checked={form.isAvailable} onChange={(v) => set({ isAvailable: v })} />
        <Toggle label="Featured on home page" checked={form.isFeatured} onChange={(v) => set({ isFeatured: v })} />
        <Toggle label="Accepts customisation" checked={form.customisable} onChange={(v) => set({ customisable: v })} />
      </div>

      <fieldset>
        <legend className="label">Images</legend>
        <ImageListEditor images={form.images} onChange={(images) => set({ images })} />
      </fieldset>

      <fieldset>
        <legend className="label">Sizes (variants)</legend>
        <p className="mb-3 text-sm text-muted">Leave empty for products with a single price. With sizes, the customer must pick one and the price follows the size.</p>
        <div className="space-y-2">
          {form.variants.map((v, i) => (
            <div key={v._id || i} className="grid grid-cols-[1.2fr_1fr_1fr_auto_auto] items-center gap-2">
              <input className="input" aria-label="Size name" placeholder="Small" value={v.size} onChange={(e) => setRow('variants', i, { size: e.target.value })} />
              <input className="input" aria-label="Price" type="number" min="0" placeholder="₹" value={v.price} onChange={(e) => setRow('variants', i, { price: e.target.value })} />
              <input className="input" aria-label="Stock" type="number" min="0" placeholder="Stock" value={v.stock} onChange={(e) => setRow('variants', i, { stock: e.target.value })} />
              <Toggle label="" checked={v.isAvailable} onChange={(val) => setRow('variants', i, { isAvailable: val })} />
              <button type="button" aria-label="Remove size" className="rounded-full p-2 text-rose hover:bg-white" onClick={() => removeRow('variants', i)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => set({ variants: [...form.variants, { size: '', price: '', stock: 20, isAvailable: true }] })}>
          <Plus size={15} /> Add size
        </button>
        {err('variants')}
      </fieldset>

      <fieldset>
        <legend className="label">Colours</legend>
        <div className="space-y-2">
          {form.colours.map((c, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <input type="color" aria-label="Colour swatch" className="h-11 w-12 cursor-pointer rounded-xl border border-line bg-white p-1" value={c.hex} onChange={(e) => setRow('colours', i, { hex: e.target.value })} />
              <input className="input" aria-label="Colour name" placeholder="Pink" value={c.name} onChange={(e) => setRow('colours', i, { name: e.target.value })} />
              <button type="button" aria-label="Remove colour" className="rounded-full p-2 text-rose hover:bg-white" onClick={() => removeRow('colours', i)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => set({ colours: [...form.colours, { name: '', hex: '#F28FB1' }] })}>
          <Plus size={15} /> Add colour
        </button>
      </fieldset>

      {state.error && (
        <p className="rounded-2xl bg-[#FBE9EC] px-4 py-3 text-sm font-medium text-[#6E1420]" role="alert">
          {state.error.message}
          {state.error.errors?.length > 0 && `: ${state.error.errors.map((e) => `${e.path} ${e.message}`).join('; ')}`}
        </p>
      )}
      <button className="btn btn-primary" disabled={state.saving}>
        {state.saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}
      </button>
    </form>
  );
}

export default function Products() {
  const { categories } = useCategories();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debounced = useDebounce(search.trim(), 300);
  const [editing, setEditing] = useState(null); // product | 'new' | null
  const { data, loading, error, reload } = useAsync(() => productApi.adminList({ search: debounced, category, limit: 100, sort: 'name_asc' }), [debounced, category]);
  const products = data?.items || [];

  const quickUpdate = async (product, patch, message) => {
    try {
      await productApi.update(product._id, patch);
      success(message);
      reload();
    } catch (e) {
      toastError(e.message);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? Past orders keep their own copy of the details.`)) return;
    try {
      await productApi.remove(product._id);
      success('Product deleted');
      invalidateCategories();
      reload();
    } catch (e) {
      toastError(e.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        action={
          <button className="btn btn-primary" onClick={() => setEditing('new')} disabled={categories.length === 0}>
            <Plus size={17} /> Add product
          </button>
        }
      >
        {data ? `${data.total} products` : 'Add, edit and manage availability.'}
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-3">
        <input className="input max-w-xs" type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : (
        <Table head={['Product', 'Category', 'Price', 'Stock', 'Available', 'Featured', '']} empty={products.length === 0 ? 'No products match.' : ''}>
          {products.map((p) => (
            <tr key={p._id} className="hover:bg-cream/60">
              <td className={td}>
                <span className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cream p-1">
                    <img src={productImage(p)} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  </span>
                  <span className="font-bold">{p.name}</span>
                </span>
              </td>
              <td className={td}>{p.category?.name}</td>
              <td className={td}>{displayPrice(p)}</td>
              <td className={td}>
                {p.hasVariants ? p.variants.map((v) => `${v.size}: ${v.stock}`).join(', ') : p.stock}
                {!p.inStock && p.isAvailable && (
                  <Badge bg="#FBE9EC" ink="#6E1420" className="ml-2">
                    Out
                  </Badge>
                )}
              </td>
              <td className={td}>
                <Toggle label="" checked={p.isAvailable} onChange={(v) => quickUpdate(p, { isAvailable: v }, v ? 'Marked available' : 'Marked unavailable')} />
              </td>
              <td className={td}>
                <Toggle label="" checked={p.isFeatured} onChange={(v) => quickUpdate(p, { isFeatured: v }, v ? 'Added to featured' : 'Removed from featured')} />
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>
                  Edit
                </button>
                <button className="ml-2 rounded-full p-2 align-middle text-rose hover:bg-white" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add product' : editing ? `Edit ${editing.name}` : ''} wide>
        {editing && (
          <ProductForm
            key={editing === 'new' ? 'new' : editing._id}
            product={editing === 'new' ? null : editing}
            categories={categories}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
