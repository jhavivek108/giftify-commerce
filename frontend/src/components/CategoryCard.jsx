import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { imageUrl } from '../utils/format';
import { themeOf } from '../utils/themes';

/**
 * The colourful collection cards. The arrangement (7/5, then 4/4/4, then one wide card)
 * follows the selected design reference. Categories an admin adds later fall back to a
 * regular one-third card, so the grid never breaks.
 */
const LAYOUT = {
  'little-love-blooms': { order: 1, span: 'lg:col-span-7', size: 'large' },
  'tiny-gardens': { order: 2, span: 'lg:col-span-5', size: 'large' },
  'little-clips': { order: 3, span: 'lg:col-span-4', size: 'regular' },
  'little-charms': { order: 4, span: 'lg:col-span-4', size: 'regular' },
  'subh-jyoti': { order: 5, span: 'lg:col-span-4', size: 'regular' },
  'mangal-dwaar': { order: 6, span: 'lg:col-span-12', size: 'wide' },
};
const FALLBACK = { order: 99, span: 'lg:col-span-4', size: 'regular' };

const IMAGE_CLASS = {
  large: 'bottom-0 right-3 max-h-[62%] max-w-[46%] sm:right-6 sm:max-h-[88%] sm:max-w-[44%]',
  regular: 'bottom-0 right-3 max-h-[58%] max-w-[46%] sm:max-h-[60%] sm:max-w-[48%]',
  wide: 'bottom-3 right-3 max-h-[58%] max-w-[44%] sm:bottom-4 sm:right-10 sm:max-h-[86%] sm:max-w-[30%]',
};

export const sortCategoriesForGrid = (categories) =>
  [...categories].sort((a, b) => (LAYOUT[a.slug] || FALLBACK).order - (LAYOUT[b.slug] || FALLBACK).order || a.sortOrder - b.sortOrder);

export default function CategoryCard({ category, index = 0 }) {
  const layout = LAYOUT[category.slug] || FALLBACK;
  const theme = themeOf(category.theme);
  const count = category.productCount;

  return (
    <motion.div
      className={`md:col-span-6 ${layout.span}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.07 }}
    >
      <Link
        to={`/shop/${category.slug}`}
        className={`group relative block h-full overflow-hidden rounded-[32px] p-7 transition-shadow duration-300 hover:shadow-lift sm:p-9 ${layout.size === 'wide' ? 'min-h-[300px] lg:min-h-[280px]' : layout.size === 'large' ? 'min-h-[340px] lg:min-h-[430px]' : 'min-h-[340px] lg:min-h-[410px]'}`}
        style={{ background: theme.bg, color: theme.ink }}
      >
        <p className="eyebrow opacity-75">Collection {String(index + 1).padStart(2, '0')}</p>
        <h3 className={`mt-3 max-w-[11ch] ${layout.size === 'regular' ? 'text-4xl' : 'text-4xl sm:text-5xl'}`}>{category.name}</h3>
        <p className={`mt-3 text-[0.98rem] leading-relaxed ${layout.size === 'wide' ? 'max-w-[26ch] sm:max-w-md' : 'max-w-[22ch] sm:max-w-[26ch]'}`}>{category.description}</p>

        <span className="btn btn-white btn-sm absolute bottom-7 left-7 sm:bottom-9 sm:left-9">
          Explore{typeof count === 'number' ? ` · ${count} ${count === 1 ? 'design' : 'designs'}` : ''}
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
        </span>

        <img
          src={imageUrl(category.image)}
          alt={category.name}
          loading="lazy"
          decoding="async"
          className={`pointer-events-none absolute object-contain drop-shadow-[0_14px_14px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:scale-[1.06] ${IMAGE_CLASS[layout.size]}`}
        />
      </Link>
    </motion.div>
  );
}

export function CategoryGrid({ categories }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12 lg:gap-6">
      {sortCategoriesForGrid(categories).map((category, i) => (
        <CategoryCard key={category._id} category={category} index={i} />
      ))}
    </div>
  );
}
