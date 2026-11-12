import { Link } from 'react-router-dom';
import NewsletterForm from './NewsletterForm';
import { InstagramIcon, WhatsAppIcon } from './ui';
import useCategories from '../hooks/useCategories';
import { BRAND_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappDisplayNumber, whatsappLink } from '../utils/whatsapp';

const col = 'space-y-2.5 text-[0.95rem] text-white/75';
const heading = 'eyebrow mb-4 text-butter';
const link = 'transition-colors hover:text-white';

export default function Footer() {
  const { categories } = useCategories();

  return (
    <footer className="mt-20 bg-olive text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
        <div>
          <span className="inline-grid h-24 w-24 place-items-center rounded-full bg-cream">
            <img src="/images/brand/logo.png" alt={BRAND_NAME} className="h-[5.25rem] w-[5.25rem]" loading="lazy" />
          </span>
          <p className="mt-4 font-display text-2xl font-bold">A little something, made by hand.</p>
          <p className="mt-2 max-w-xs text-sm text-white/70">Pipe-cleaner flowers, accessories and festive decor, handmade with love, patience and care.</p>
        </div>

        <nav aria-label="Shop">
          <p className={heading}>Shop</p>
          <ul className={col}>
            <li>
              <Link to="/shop" className={link}>
                All products
              </Link>
            </li>
            <li>
              <Link to="/collections" className={link}>
                Collections
              </Link>
            </li>
            <li>
              <Link to="/wishlist" className={link}>
                Wishlist
              </Link>
            </li>
            <li>
              <Link to="/orders" className={link}>
                My orders
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Categories">
          <p className={heading}>Categories</p>
          <ul className={col}>
            {categories.map((c) => (
              <li key={c._id}>
                <Link to={`/shop/${c.slug}`} className={link}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <p className={heading}>About</p>
          <ul className={col}>
            <li>
              <Link to="/about" className={link}>
                About us
              </Link>
            </li>
            <li>
              <Link to="/contact" className={link}>
                Contact
              </Link>
            </li>
            <li>
              <Link to="/privacy-policy" className={link}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms-and-conditions" className={link}>
                Terms and Conditions
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className={heading}>Say hello</p>
          <ul className={col}>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 ${link}`}>
                <InstagramIcon size={18} /> {INSTAGRAM_HANDLE}
              </a>
            </li>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 ${link}`}>
                <WhatsAppIcon size={18} /> {whatsappDisplayNumber()}
              </a>
            </li>
          </ul>
          <p className="mb-2 mt-6 text-sm text-white/70">New designs and festive drops, in your inbox.</p>
          <NewsletterForm dark />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-5 text-sm text-white/60">
          <p>
            © {new Date().getFullYear()} {BRAND_NAME}. Thank you for supporting handmade.
          </p>
          <Link to="/admin/login" className="hover:text-white">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
