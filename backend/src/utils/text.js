/** Escapes user input so it can be used safely inside a RegExp. */
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Returns `base`, or `base-2`, `base-3`... whichever is not taken in Model yet. */
export async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base) || 'item';
  for (let n = 1; n < 500; n += 1) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    if (!(await Model.exists(filter))) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Shallow copy without undefined values, so doc.set() never unsets a field by accident. */
export const definedOnly = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
