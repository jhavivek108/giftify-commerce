import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { STORY_TAGLINE } from '../utils/story';

const CHIPS = [
  { label: 'All products', to: '/shop', active: true },
  { label: 'Under ₹100', to: '/shop?maxPrice=100' },
  { label: 'Under ₹300', to: '/shop?maxPrice=300' },
  { label: 'Keychains', to: '/shop/little-charms' },
  { label: 'Hair clips', to: '/shop/little-clips' },
  { label: 'Festive decor', to: '/shop/mangal-dwaar' },
];

function Floating({ src, className, delay = 0, drift = 10 }) {
  const reduce = useReducedMotion();
  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none absolute select-none drop-shadow-[0_16px_16px_rgba(51,61,37,0.18)] ${className}`}
      initial={{ opacity: 0, y: 24 }}
      animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -drift, 0] }}
      transition={reduce ? { duration: 0.4, delay } : { opacity: { duration: 0.6, delay }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay } }}
    />
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Product photography either side of the headline (wide screens) */}
      <div className="hidden xl:block" aria-hidden="true">
        <Floating src="/images/products/cherry-baby-keychain.webp" className="left-[6%] top-10 w-28 -rotate-12 2xl:w-32" delay={0.1} />
        <Floating src="/images/products/nazar-charm-keychain.webp" className="right-[6.5%] top-8 w-24 rotate-12 2xl:w-28" delay={0.2} />
        <img src="/images/brand/bouquet-pastel.webp" alt="" className="pointer-events-none absolute -bottom-2 left-[3%] w-48 drop-shadow-[0_16px_16px_rgba(51,61,37,0.16)] 2xl:left-[7%] 2xl:w-60" />
        <img src="/images/brand/bouquet-bright.webp" alt="" className="pointer-events-none absolute -bottom-2 right-[3%] w-48 drop-shadow-[0_16px_16px_rgba(51,61,37,0.16)] 2xl:right-[7%] 2xl:w-60" />
      </div>

      <div className="container-page relative pb-12 pt-10 text-center sm:pt-14 xl:pb-24 xl:pt-16">
        <motion.p className="eyebrow text-[#B8935A]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {STORY_TAGLINE}
        </motion.p>

        <motion.h1
          className="mx-auto mt-5 max-w-[15ch] text-[2.9rem] font-extrabold leading-[1.02] sm:text-7xl lg:text-[5.75rem]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          A little something, made by{' '}
          <span className="relative -top-1 inline-block px-1 font-script text-[1.35em] font-normal leading-[0.7] text-rose">hand.</span>
        </motion.h1>

        <motion.p className="mx-auto mt-6 max-w-xl text-lg text-muted" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}>
          Handmade flowers, little charms and thoughtful creations made to bring a smile.
        </motion.p>

        <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.26 }}>
          <Link to="/shop" className="btn btn-primary">
            Explore Collection <ArrowRight size={17} />
          </Link>
          <Link to="/about" className="btn btn-outline">
            Our Story
          </Link>
        </motion.div>

        <motion.div className="mx-auto mt-9 flex max-w-2xl flex-wrap justify-center gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.36 }}>
          {CHIPS.map((chip) => (
            <Link key={chip.label} to={chip.to} className={`chip ${chip.active ? 'is-active' : ''}`}>
              {chip.label}
            </Link>
          ))}
        </motion.div>

        {/* Product photography under the headline (phones and tablets) */}
        <div className="mt-10 flex items-end justify-center gap-4 xl:hidden" aria-hidden="true">
          <img src="/images/brand/bouquet-pastel.webp" alt="" className="w-[30%] max-w-40" />
          <img src="/images/products/golden-garden.webp" alt="" className="w-[24%] max-w-32 pb-2" />
          <img src="/images/brand/bouquet-bright.webp" alt="" className="w-[30%] max-w-40" />
        </div>
      </div>
    </section>
  );
}
