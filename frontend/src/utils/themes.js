/**
 * Pastel card themes used by category cards, product tiles and badges.
 * `bg` is the card colour, `ink` the readable text colour on top of it,
 * `accent` the stronger brand shade used for small details.
 */
export const THEMES = {
  pink: { bg: '#F5C9D1', ink: '#6E1420', accent: '#E9A6B5', tile: '#FBE9EC' },
  yellow: { bg: '#FBE08F', ink: '#5A3C00', accent: '#F5D77A', tile: '#FDF3D2' },
  lavender: { bg: '#D9CDF1', ink: '#37246B', accent: '#C6B5E3', tile: '#EFE9FA' },
  blue: { bg: '#CBE3F4', ink: '#0E2F6B', accent: '#A9D1E8', tile: '#E6F2FA' },
  mint: { bg: '#D2E5CF', ink: '#1E4A26', accent: '#B9D0B5', tile: '#E8F2E6' },
  peach: { bg: '#F9D6BE', ink: '#6B2F0E', accent: '#F2B48E', tile: '#FCEADD' },
};

export const themeOf = (key) => THEMES[key] || THEMES.pink;

/** Colours customers can ask for. "As pictured" always comes from the product itself. */
export const REQUEST_COLOURS = [
  { name: 'Pink', hex: '#F28FB1' },
  { name: 'Red', hex: '#D81F26' },
  { name: 'Yellow', hex: '#F7C21A' },
  { name: 'Orange', hex: '#F58A1F' },
  { name: 'Lavender', hex: '#B79BE0' },
  { name: 'Blue', hex: '#5BB3E8' },
  { name: 'White', hex: '#FFFFFF' },
];

export const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export const STATUS_STYLES = {
  placed: { bg: '#FDF3D2', ink: '#5A3C00' },
  confirmed: { bg: '#E6F2FA', ink: '#0E2F6B' },
  processing: { bg: '#EFE9FA', ink: '#37246B' },
  shipped: { bg: '#FCEADD', ink: '#6B2F0E' },
  delivered: { bg: '#E8F2E6', ink: '#1E4A26' },
  cancelled: { bg: '#FBE9EC', ink: '#6E1420' },
  pending: { bg: '#FDF3D2', ink: '#5A3C00' },
  paid: { bg: '#E8F2E6', ink: '#1E4A26' },
  failed: { bg: '#FBE9EC', ink: '#6E1420' },
  refunded: { bg: '#EFE9FA', ink: '#37246B' },
};
