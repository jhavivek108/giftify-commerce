import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ErrorMessage, LoadingSpinner, Modal } from '../../components/ui';
import useAsync from '../../hooks/useAsync';
import { invalidateCategories } from '../../hooks/useCategories';
import { categoryApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { capitalise, fieldErrors, imageUrl } from '../../utils/format';
import { THEMES, themeOf } from '../../utils/themes';
import { ImageListEditor, PageHeader, Toggle } from './shared';

function CategoryForm({ category, onSaved }) {
  const { success } = useToast();
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image: category?.image || '',
    theme: category?.theme || 'pink',
    sortOrder: category?.sortOrder ?? 0,
    isActive: category?.isActive !== false,
  });
  const [state, setState] = useState({ saving: false, error: null });
  const errors = fieldErrors(state.error);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ saving: true, error: null });
    const body = { ...form, name: form.name.trim(), description: form.description.trim(), sortOrder: Number(form.sortOrder) || 0 };
    try {
      if (category) await categoryApi.update(category._id, body);
      else await categoryApi.create(body);
      success(category ? 'Category updated' : 'Category created');
      invalidateCategories();
      onSaved();
    } catch (error) {
      setState({ saving: false, error });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label className="label" htmlFor="c-name">
          Name
        </label>
        <input id="c-name" className="input" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>
      <div>
        <label className="label" htmlFor="c-desc">
          Description
        </label>
        <textarea id="c-desc" className="input min-h-20" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <fieldset>
        <legend className="label">Card colour</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(THEMES).map(([key, theme]) => (
            <button key={key} type="button" aria-pressed={form.theme === key} onClick={() => set({ theme: key })} className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${form.theme === key ? 'border-olive' : 'border-transparent'}`} style={{ background: theme.bg, color: theme.ink }}>
              {capitalise(key)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Image</legend>
        <ImageListEditor single images={form.image ? [{ url: form.image }] : []} onChange={(images) => set({ image: images[0]?.url || '' })} />
      </fieldset>
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="label" htmlFor="c-sort">
            Sort order
          </label>
          <input id="c-sort" className="input w-28" type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
        </div>
        <Toggle label="Visible in shop" checked={form.isActive} onChange={(v) => set({ isActive: v })} />
      </div>
      {state.error && (
        <p className="rounded-2xl bg-[#FBE9EC] px-4 py-3 text-sm font-medium text-[#6E1420]" role="alert">
          {state.error.message}
        </p>
      )}
      <button className="btn btn-primary" disabled={state.saving}>
        {state.saving ? 'Saving…' : category ? 'Save changes' : 'Create category'}
      </button>
    </form>
  );
}

export default function Categories() {
  const { success, error: toastError } = useToast();
  const { data, loading, error, reload } = useAsync(() => categoryApi.list(), []);
  const [editing, setEditing] = useState(null);
  const categories = data?.items || [];

  const remove = async (category) => {
    if (!window.confirm(`Delete the "${category.name}" category?`)) return;
    try {
      await categoryApi.remove(category._id);
      success('Category deleted');
      invalidateCategories();
      reload();
    } catch (e) {
      toastError(e.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        action={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={17} /> Add category
          </button>
        }
      >
        A category can only be deleted once it has no products.
      </PageHeader>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => {
            const theme = themeOf(c.theme);
            return (
              <article key={c._id} className="relative flex min-h-56 flex-col overflow-hidden rounded-[28px] p-6" style={{ background: theme.bg, color: theme.ink }}>
                <h2 className="max-w-[60%] text-2xl">{c.name}</h2>
                <p className="mt-2 max-w-[62%] text-sm">{c.description}</p>
                <p className="mt-2 text-sm font-bold">
                  {c.productCount} {c.productCount === 1 ? 'product' : 'products'}
                </p>
                {c.image && <img src={imageUrl(c.image)} alt="" className="pointer-events-none absolute bottom-2 right-3 max-h-[70%] max-w-[36%] object-contain" loading="lazy" />}
                <div className="mt-auto flex gap-2 pt-4">
                  <button className="btn btn-white btn-sm" onClick={() => setEditing(c)}>
                    Edit
                  </button>
                  <button className="btn btn-white btn-sm" onClick={() => remove(c)} disabled={c.productCount > 0} title={c.productCount > 0 ? 'Move or delete its products first' : ''}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add category' : editing ? `Edit ${editing.name}` : ''}>
        {editing && (
          <CategoryForm
            key={editing === 'new' ? 'new' : editing._id}
            category={editing === 'new' ? null : editing}
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
