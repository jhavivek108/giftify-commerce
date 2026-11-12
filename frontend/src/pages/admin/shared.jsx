import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { adminApi } from '../../services/api';
import { imageUrl } from '../../utils/format';

export function PageHeader({ title, children, action }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl">{title}</h1>
        {children && <p className="mt-1 text-muted">{children}</p>}
      </div>
      {action}
    </header>
  );
}

export function Table({ head, children, empty }) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[0.93rem]">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            {head.map((h) => (
              <th key={h} scope="col" className="px-5 py-4 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-5 py-10 text-center text-muted">{empty}</p>}
    </div>
  );
}

export const td = 'px-5 py-3.5 align-middle';

export function Pager({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-center gap-3 text-sm">
      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium">
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-11 rounded-full bg-line transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-olive peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-olive peer-focus-visible:ring-offset-2" />
      {label}
    </label>
  );
}

/** Editable list of image URLs with upload (admin only, goes through the Express API). */
export function ImageListEditor({ images, onChange, single = false }) {
  const input = useRef(null);
  const [state, setState] = useState({ uploading: false, error: '' });

  const upload = async (files) => {
    if (!files?.length) return;
    setState({ uploading: true, error: '' });
    try {
      const data = await adminApi.upload(single ? [files[0]] : files);
      const added = data.files.map((f) => ({ url: f.url, alt: '' }));
      onChange(single ? added.slice(0, 1) : [...images, ...added]);
      setState({ uploading: false, error: '' });
    } catch (e) {
      setState({ uploading: false, error: e.message });
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((image, i) => (
          <div key={image.url + i} className="relative h-24 w-24 rounded-2xl bg-cream p-2">
            <img src={imageUrl(image.url)} alt="" className="h-full w-full object-contain" />
            <button type="button" aria-label="Remove image" onClick={() => onChange(images.filter((_, n) => n !== i))} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-rose shadow">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => input.current?.click()} disabled={state.uploading} className="grid h-24 w-24 place-items-center rounded-2xl border-[1.5px] border-dashed border-olive/40 text-sm font-medium text-muted hover:bg-cream">
          <span className="grid place-items-center gap-1">
            <ImagePlus size={20} />
            {state.uploading ? 'Uploading…' : 'Upload'}
          </span>
        </button>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple={!single} hidden onChange={(e) => upload(e.target.files)} />
      <p className="mt-2 text-xs text-muted">JPG, PNG or WebP, up to 5 MB each.{single ? '' : ' The first image is the main one.'}</p>
      {state.error && <p className="field-error">{state.error}</p>}
    </div>
  );
}
