import crypto from 'node:crypto';

// No 0/O/1/I/L so numbers are easy to read out over the phone or WhatsApp.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** e.g. LGS-261111-7K3Q (LGS-YYMMDD-random) */
export function generateOrderNumber(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 4; i += 1) suffix += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `LGS-${yy}${mm}${dd}-${suffix}`;
}
