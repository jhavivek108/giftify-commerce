import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './ui';

/** The dark burgundy banner from the design reference. It is the one dark block on the page. */
export default function PromotionalBanner() {
  return (
    <Reveal>
      <section
        className="relative overflow-hidden rounded-[32px] bg-burgundy px-7 py-12 text-[#FFE9C2] sm:px-12 sm:py-16 lg:min-h-[480px] lg:px-16"
        style={{ backgroundImage: 'radial-gradient(circle at 78% 45%, rgba(247, 201, 92, 0.22), transparent 55%)' }}
        aria-labelledby="promo-heading"
      >
        <div className="relative z-10 max-w-xl lg:max-w-[50%]">
          <p className="eyebrow text-gold">Festive favourites · Mangal Dwaar &amp; Subh Jyoti</p>
          <h2 id="promo-heading" className="mt-4 text-4xl text-white sm:text-5xl lg:text-6xl">
            Little things, made with lots of love.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed">Discover handmade creations that make every moment a little more special.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop/mangal-dwaar" className="btn btn-gold">
              Explore festive decor <ArrowRight size={17} />
            </Link>
            <Link to="/shop" className="btn border-[1.5px] border-white/40 text-white hover:bg-white/10">
              Shop everything
            </Link>
          </div>
        </div>

        <div className="relative mt-10 flex h-56 items-end justify-center gap-5 sm:h-72 lg:absolute lg:inset-y-0 lg:right-8 lg:mt-0 lg:h-auto lg:w-[46%] lg:items-center lg:justify-end lg:gap-6" aria-hidden="true">
          <img src="/images/products/utsav-latkan.webp" alt="" loading="lazy" className="max-h-full w-[40%] object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.35)] lg:max-h-[80%] lg:w-[38%]" />
          <img src="/images/products/sajni-toran.webp" alt="" loading="lazy" className="hidden max-h-full w-[24%] object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.35)] sm:block lg:max-h-[84%]" />
          <img src="/images/brand/diyas-in-hand.webp" alt="" loading="lazy" className="max-h-full w-[34%] self-end object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.35)] lg:max-h-[62%] lg:w-[30%]" />
        </div>
      </section>
    </Reveal>
  );
}
