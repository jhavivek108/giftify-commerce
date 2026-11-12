import { formatINR } from './format';

export const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Little Gifts Story';
export const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/littlegiftsstory';
export const INSTAGRAM_HANDLE = '@littlegiftsstory';

/** Digits only, with the India country code added when a bare 10-digit number is configured. */
export const whatsappNumber = () => {
  const digits = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

export const whatsappDisplayNumber = () => {
  const n = whatsappNumber();
  return n.length === 12 && n.startsWith('91') ? `+91 ${n.slice(2, 7)} ${n.slice(7)}` : n ? `+${n}` : '';
};

/**
 * Official click-to-chat link. It only OPENS WhatsApp with the text filled in;
 * the customer reviews it and presses send themselves.
 */
export const whatsappLink = (text = '') => {
  const base = `https://wa.me/${whatsappNumber()}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

const itemLines = (item, index) => {
  const lines = [`${index + 1}. ${item.name} × ${item.quantity}`];
  if (item.colour) lines.push(`   Colour: ${item.colour}`);
  if (item.size) lines.push(`   Size: ${item.size}`);
  if (item.customisation?.instructions) lines.push(`   Customisation: ${item.customisation.instructions}`);
  if (item.customisation?.message) lines.push(`   Personal message: ${item.customisation.message}`);
  return lines.join('\n');
};

/**
 * items: [{ name, quantity, colour, size, customisation: { instructions, message } }]
 */
export const buildOrderMessage = ({ customerName, items, total, orderNumber }) => {
  const parts = [`Hi ${BRAND_NAME}! 💌`, ''];
  if (orderNumber) parts.push(`Order number: ${orderNumber}`);
  if (customerName) parts.push(`Name: ${customerName}`);
  parts.push('', 'I would like to order:', ...items.map(itemLines), '');
  parts.push(`Total amount: ${formatINR(total)}`);
  return parts.join('\n');
};

export const cartItemsForMessage = (items) =>
  items.map((i) => ({
    name: i.product?.name || i.name,
    quantity: i.quantity,
    colour: i.colour,
    size: i.size,
    customisation: i.customisation,
  }));
