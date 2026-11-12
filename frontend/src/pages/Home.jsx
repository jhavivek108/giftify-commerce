import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import HeroSection from '../components/HeroSection';
import { CategoryGrid } from '../components/CategoryCard';
import ProductGrid from '../components/ProductGrid';
import PromotionalBanner from '../components/PromotionalBanner';
import Testimonials from '../components/Testimonials';
import InstagramGallery from '../components/InstagramGallery';
import CustomisationForm, { emptySelection, selectionPrice } from '../components/CustomisationForm';
import { ErrorMessage, LoadingSpinner, Reveal, SectionHeading, WhatsAppIcon } from '../components/ui';
import useAsync from '../hooks/useAsync';
import useCategories from '../hooks/useCategories';
import { productApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { priceWithUnit, productImage } from '../utils/format';
import { buildOrderMessage, INSTAGRAM_HANDLE, whatsappLink } from '../utils/whatsapp';
import { FOUNDER, STORY_PARAGRAPHS } from '../utils/story';
import { themeOf } from '../utils/themes';

function PersonalisationSection({ products }) {
  const { addItem, busy } = useCart();
  const [productId, setProductId] = useState('');
  const product = useMemo(() => products.find((p) => p._id === productId) || products[0], [products, productId]);
  const [selection, setSelection] = useState(null);
  const value = selection && selection.for === product?._id ? selection : { ...emptySelection(product), for: product?._id };

  const grouped = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const key = p.category?.name || 'Other';
      map.set(key, [...(map.get(key) || []), p]);
    });
    return [...map.entries()];
  }, [products]);

  if (!product) return null;
  const theme = themeOf(product.category?.theme);
  const variant = product.variants?.find((v) => v._id === value.variantId);
  const total = selectionPrice(product, value) * value.quantity;

  const message = buildOrderMessage({
    items: [
      {
        name: product.name,
        quantity: value.quantity,
        colour: value.colour,
        size: variant?.size,
        customisation: { instructions: value.instructions, message: value.message },
      },
    ],
    total,
  });

  return (
    <section className="container-page mt-20 sm:mt-28" id="personalise" aria-labelledby="personalise-heading">
      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="relative overflow-hidden rounded-[32px] p-8 sm:p-10 lg:col-span-5" as="div">
          <div className="absolute inset-0" style={{ background: theme.bg }} />
          <div className="relative" style={{ color: theme.ink }}>
            <p className="eyebrow opacity-75">Personalisation</p>
            <h2 id="personalise-heading" className="mt-3 text-4xl sm:text-5xl">
              Made just for you.
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed">We create designs in different colours and styles, customised to your preferences and made uniquely yours.</p>
            <div className="mt-8 grid h-56 place-items-center sm:h-72">
              <img key={product._id} src={productImage(product)} alt={product.name} loading="lazy" className="max-h-full max-w-[75%] object-contain drop-shadow-[0_16px_16px_rgba(0,0,0,0.18)]" />
            </div>
            <p className="mt-4 font-display text-2xl font-bold">{product.name}</p>
            <p className="font-bold">{priceWithUnit(selectionPrice(product, value), product.priceUnit)}</p>
          </div>
        </Reveal>

        <Reveal className="surface p-6 sm:p-9 lg:col-span-7" delay={0.08}>
          <label className="label" htmlFor="personalise-product">
            Which design would you like?
          </label>
          <select id="personalise-product" className="input mb-6" value={product._id} onChange={(e) => setProductId(e.target.value)}>
            {grouped.map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((p) => (
                  <option key={p._id} value={p._id} disabled={!p.inStock}>
                    {p.name}
                    {!p.inStock ? ' (unavailable)' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <CustomisationForm product={product} value={value} onChange={(next) => setSelection({ ...next, for: product._id })} />

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <p className="mr-auto text-lg font-bold">
              Total <span className="font-display text-2xl">{priceWithUnit(total)}</span>
            </p>
            <button
              className="btn btn-primary"
              disabled={!product.inStock || busy}
              onClick={() =>
                addItem(product, {
                  variantId: value.variantId,
                  colour: value.colour,
                  quantity: value.quantity,
                  customisation: { instructions: value.instructions, message: value.message },
                })
              }
            >
              Add to cart
            </button>
            <a className="btn btn-whatsapp" href={whatsappLink(message)} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={18} /> Request on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { categories, loading: catLoading, error: catError } = useCategories();
  const featured = useAsync(() => productApi.list({ featured: true, limit: 8 }), []);
  const all = useAsync(() => productApi.list({ limit: 100, sort: 'featured' }), []);

  return (
    <>
      <HeroSection />

      <section className="container-page" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="sr-only">
          Shop by category
        </h2>
        {catLoading ? <LoadingSpinner label="Loading collections…" /> : catError ? <ErrorMessage error={catError} /> : <CategoryGrid categories={categories} />}
      </section>

      <section className="container-page mt-20 sm:mt-28" aria-labelledby="featured-heading">
        <SectionHeading
          eyebrow="Little favourites"
          title={<span id="featured-heading">Featured products</span>}
          action={
            <Link to="/shop" className="btn btn-outline btn-sm">
              View all <ArrowRight size={15} />
            </Link>
          }
        >
          A few pieces from each collection, all made by hand.
        </SectionHeading>
        {featured.loading ? <LoadingSpinner /> : featured.error ? <ErrorMessage error={featured.error} onRetry={featured.reload} /> : <ProductGrid products={featured.data.items} />}
      </section>

      <div className="container-page mt-20 sm:mt-28">
        <PromotionalBanner />
      </div>

      {all.data?.items?.length > 0 && <PersonalisationSection products={all.data.items} />}

      <section className="container-page mt-20 sm:mt-28" aria-labelledby="story-heading">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-5">
            <div className="overflow-hidden rounded-[32px] bg-[#D2E5CF] p-3">
              <img src={FOUNDER.photo} alt={`${FOUNDER.name}, founder of Little Gifts Story, holding a bouquet of handmade blooms`} loading="lazy" className="aspect-[4/3.6] w-full rounded-[24px] object-cover" />
            </div>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={0.08}>
            <p className="eyebrow text-[#B8935A]">Our story</p>
            <h2 id="story-heading" className="mt-3 text-4xl sm:text-5xl">
              Every little gift has a story.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-olive/85">{STORY_PARAGRAPHS[2]}</p>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">{STORY_PARAGRAPHS[4]}</p>
            <p className="mt-6 font-script text-5xl text-rose">{FOUNDER.name}</p>
            <p className="text-sm font-bold">{FOUNDER.title}</p>
            <Link to="/about" className="btn btn-outline mt-7">
              Read the full story <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="container-page mt-20 sm:mt-28" aria-labelledby="reviews-heading">
        <SectionHeading eyebrow="Kind words" title={<span id="reviews-heading">What customers say</span>} />
        <Testimonials />
      </section>

      <section className="container-page mt-20 sm:mt-28" aria-labelledby="instagram-heading">
        <SectionHeading eyebrow={INSTAGRAM_HANDLE} title={<span id="instagram-heading">Fresh from the craft table</span>} align="center">
          New designs, festive drops and behind-the-scenes on Instagram.
        </SectionHeading>
        <InstagramGallery />
      </section>
    </>
  );
}
