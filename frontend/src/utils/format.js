const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatINR = (amount) => inr.format(Number(amount) || 0);

/** "₹50 each", "₹50 / set of 2", "₹249 for 2 pieces" */
export const priceWithUnit = (amount, unit) => {
  const price = formatINR(amount);
  if (!unit) return price;
  if (unit === 'each') return `${price} each`;
  if (/^\d/.test(unit)) return `${price} for ${unit}`;
  return `${price} / ${unit}`;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_ORIGIN = /^https?:\/\//.test(API_BASE) ? new URL(API_BASE).origin : '';

/** Uploaded images live on the API server; catalogue images ship with the frontend. */
export const imageUrl = (url) => {
  if (!url) return '/images/brand/logo.png';
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`;
  return url;
};

export const productImage = (product) => imageUrl(product?.images?.[0]?.url);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

export const capitalise = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/** Lowest price of a product ("from ₹249" when it has size variants). */
export const displayPrice = (product) => {
  if (!product) return '';
  const label = priceWithUnit(product.basePrice, product.priceUnit);
  return product.hasVariants ? `From ${label}` : label;
};

export const fieldErrors = (error) =>
  Object.fromEntries((error?.errors || []).map((e) => [e.path, e.message]));
