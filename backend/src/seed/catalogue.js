/**
 * Little Gifts Story — Product Catalogue 2026.
 * This file is the single source of truth for the seed data.
 * Names, categories, prices and size variants are copied from the catalogue.
 * 44 designs across 6 categories. Do not add products that are not in the catalogue.
 */

const NOTE =
  'We create designs in different colours and styles, customised to your preferences and made uniquely yours.';

const img = (slug, alt) => [{ url: `/images/products/${slug}.webp`, alt }];

export const categories = [
  {
    name: 'Little Charms',
    slug: 'little-charms',
    description: 'Handmade pipe-cleaner keychains: tiny flowers, hearts and lucky charms to carry everywhere.',
    image: '/images/products/red-rose-keychain.webp',
    theme: 'blue',
    sortOrder: 1,
  },
  {
    name: 'Little Clips',
    slug: 'little-clips',
    description: 'Hair clips in sets of two: flowers, bows, hearts and butterflies.',
    image: '/images/products/purple-butterfly-clips.webp',
    theme: 'lavender',
    sortOrder: 2,
  },
  {
    name: 'Little Love Blooms',
    slug: 'little-love-blooms',
    description: 'Gift a little flower, make someone’s day, or treat yourself to a little happiness.',
    image: '/images/brand/bouquet.webp',
    theme: 'pink',
    sortOrder: 3,
  },
  {
    name: 'Tiny Gardens',
    slug: 'tiny-gardens',
    description: 'Little potted blooms for a desk, a shelf or a windowsill.',
    image: '/images/products/golden-garden.webp',
    theme: 'yellow',
    sortOrder: 4,
  },
  {
    name: 'Mangal Dwaar',
    slug: 'mangal-dwaar',
    description: 'Festive door hangings and torans, sold as a pair in small and medium sizes.',
    image: '/images/products/phool-jhilmil.webp',
    theme: 'peach',
    sortOrder: 5,
  },
  {
    name: 'Subh Jyoti',
    slug: 'subh-jyoti',
    description: 'Handmade diya holders, sold as a pair. Light up hearts and homes with a little diya magic.',
    image: '/images/brand/diyas-in-hand.webp',
    theme: 'mint',
    sortOrder: 6,
  },
];

// [name, colour name, colour hex, featured]
const CHARMS = [
  ['Sunny Smile', 'Yellow', '#F2C21A'],
  ['Little Sun', 'Orange', '#F59A1B'],
  ['Love Bug', 'Red', '#E0202B'],
  ['Cherry Baby', 'Red', '#E0202B'],
  ['Purple Bloom', 'Lavender', '#A98BD9'],
  ['Pink Bloom', 'Pink', '#F28FB1'],
  ['Blue Bloom', 'Sky blue', '#7DB8EA'],
  ['Yellow Bloom', 'Yellow', '#F7B500'],
  ['Red Rose', 'Red', '#C8102E', true],
  ['Lucky Charm', 'Royal blue', '#1F3FD1'],
  ['Nazar Charm', 'Royal blue', '#1F3FD1', true],
  ['Bow Babe', 'Pink', '#F7A8C4'],
];

const CLIPS = [
  ['Sunflower', 'Yellow', '#F7B500'],
  ['Rose', 'Red', '#C8102E'],
  ['Pink Flower', 'Hot pink', '#E8437F'],
  ['Purple Flower', 'Lavender', '#A98BD9'],
  ['Blue Flower', 'Royal blue', '#1F3FD1'],
  ['Yellow Flower', 'Yellow', '#F2D21A'],
  ['Red Heart', 'Red', '#E0202B'],
  ['Yellow Butterfly', 'Yellow', '#F2D21A'],
  ['Purple Butterfly', 'Lavender', '#A98BD9', true],
  ['Candy', 'Pink and white', '#F2649B'],
  ['Three Heart', 'Multicolour', '#F56A3A'],
  ['Pretty Bow', 'Baby pink', '#F7B6CB', true],
];

const BLOOMS = [
  ['Violet Wish', 'Lavender', '#B79BE0'],
  ['Pinky Blush', 'Blush pink', '#F5A9A0', true],
  ['Sunny Bloom', 'Yellow', '#F7B500'],
  ['Rosie Pop', 'Red', '#E0261C'],
  ['Wine Kiss', 'Wine', '#6B1024'],
  ['Blueberry', 'Blue', '#4FA8E0'],
];

const GARDENS = [
  ['Rosy Basket', 'Red', '#C8102E'],
  ['Little Sunshine', 'Yellow', '#F7B500'],
  ['Golden Garden', 'Yellow', '#F2C21A', true],
  ['Honey Pot', 'Yellow', '#F2D21A'],
];

// [name, slug, colour name, colour hex, small price, medium price, featured]
const MANGAL_DWAAR = [
  ['Utsav Latkan', 'utsav-latkan', 'Orange and pink', '#F58A1F', 249, 349],
  ['Phool Jhilmil', 'phool-jhilmil', 'Yellow and pink', '#F2B61A', 249, 349, true],
  ['Utsav Latkan (Blue)', 'utsav-latkan-blue', 'Blue', '#5BB3E8', 249, 349],
  ['Sajni Toran', 'sajni-toran', 'Pink', '#E8437F', 399, 549],
];

const SUBH_JYOTI = [
  ['Lavender Love', 'Lavender', '#B79BE0'],
  ['Pearl Petal', 'Cream and maroon', '#F1DDD0'],
  ['Ruby Rani', 'Pink and red', '#E8195F', true],
  ['Ocean Bloom', 'Blue', '#27B4DC'],
  ['Cherry Bloom', 'Red', '#D81F26'],
  ['Pink Princess', 'Pink', '#F29BB8'],
];

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const simple = (rows, { categorySlug, suffix, price, priceUnit, describe }) =>
  rows.map(([name, colourName, hex, featured], i) => {
    const slug = suffix ? `${slugify(name)}-${suffix}` : slugify(name);
    return {
      name,
      slug,
      categorySlug,
      description: `${describe(name)} ${NOTE}`,
      basePrice: price,
      priceUnit,
      images: img(slug, `${name} — Little Gifts Story`),
      colours: [{ name: colourName, hex }],
      variants: [],
      customisable: true,
      isFeatured: Boolean(featured),
      sortOrder: i + 1,
    };
  });

export const products = [
  ...simple(CHARMS, {
    categorySlug: 'little-charms',
    suffix: 'keychain',
    price: 50,
    priceUnit: 'each',
    describe: (n) => `${n} is a handmade pipe-cleaner keychain from our Little Charms collection.`,
  }),
  ...simple(CLIPS, {
    categorySlug: 'little-clips',
    suffix: 'clips',
    price: 50,
    priceUnit: 'set of 2',
    describe: (n) => `${n} is a set of two handmade pipe-cleaner hair clips from our Little Clips collection.`,
  }),
  ...simple(BLOOMS, {
    categorySlug: 'little-love-blooms',
    suffix: '',
    price: 149,
    priceUnit: 'each',
    describe: (n) =>
      `${n} is a single handmade pipe-cleaner flower. Gift a little flower, make someone’s day, or treat yourself to a little happiness.`,
  }),
  ...simple(GARDENS, {
    categorySlug: 'tiny-gardens',
    suffix: '',
    price: 299,
    priceUnit: 'each',
    describe: (n) => `${n} is a handmade potted bloom from our Tiny Gardens collection.`,
  }),
  ...MANGAL_DWAAR.map(([name, slug, colourName, hex, small, medium, featured], i) => ({
    name,
    slug,
    categorySlug: 'mangal-dwaar',
    description: `${name} is a pair of handmade festive door hangings from our Mangal Dwaar collection. Each order is 2 pieces. ${NOTE}`,
    basePrice: small,
    priceUnit: '2 pieces',
    images: img(slug, `${name} — Little Gifts Story`),
    colours: [{ name: colourName, hex }],
    variants: [
      { size: 'Small', price: small },
      { size: 'Medium', price: medium },
    ],
    customisable: true,
    isFeatured: Boolean(featured),
    sortOrder: i + 1,
  })),
  ...SUBH_JYOTI.map(([name, colourName, hex, featured], i) => {
    const slug = slugify(name);
    return {
      name,
      slug,
      categorySlug: 'subh-jyoti',
      description: `${name} is a pair of handmade diya holders from our Subh Jyoti collection. Each order is 2 pieces. ${NOTE}`,
      basePrice: 249,
      priceUnit: '2 pieces',
      images: img(slug, `${name} — Little Gifts Story`),
      colours: [{ name: colourName, hex }],
      variants: [
        { size: 'Small', price: 249 },
        { size: 'Medium', price: 349 },
      ],
      customisable: true,
      isFeatured: Boolean(featured),
      sortOrder: i + 1,
    };
  }),
];

if (products.length !== 44) {
  throw new Error(`Catalogue must contain exactly 44 designs, found ${products.length}`);
}
