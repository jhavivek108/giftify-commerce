import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LogOut, Menu, Package, Search, Settings, ShoppingBag, User, X } from 'lucide-react';
import SearchBar from './SearchBar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { BRAND_NAME } from '../utils/whatsapp';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'Our Story' },
  { to: '/contact', label: 'Contact' },
];

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.5 }}
      animate={{ scale: 1 }}
      className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[0.65rem] font-bold text-white"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}

const iconBtn = 'relative grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-white';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const { count: wishCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = ({ isActive }) =>
    `relative py-1 text-[0.95rem] font-medium transition-colors hover:text-olive ${isActive ? 'text-olive after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-olive' : 'text-olive/75'}`;

  return (
    <header className={`sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'bg-cream/92 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md' : 'bg-cream'}`}>
      <div className="container-page flex h-[76px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label={`${BRAND_NAME} — home`}>
          <img src="/images/brand/logo.png" alt={BRAND_NAME} className="h-14 w-14 sm:h-16 sm:w-16" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button className={iconBtn} onClick={() => setSearchOpen((v) => !v)} aria-label="Search" aria-expanded={searchOpen}>
            <Search size={20} />
          </button>
          <Link to="/wishlist" className={iconBtn} aria-label={`Wishlist (${wishCount})`}>
            <Heart size={20} />
            <CountBadge count={wishCount} />
          </Link>
          <button className={iconBtn} onClick={openDrawer} aria-label={`Shopping cart (${itemCount} items)`}>
            <ShoppingBag size={20} />
            <CountBadge count={itemCount} />
          </button>

          <div className="relative hidden sm:block">
            {user ? (
              <button className={iconBtn} onClick={() => setAccountOpen((v) => !v)} aria-label="Account" aria-expanded={accountOpen}>
                <User size={20} />
              </button>
            ) : (
              <Link to="/login" className={iconBtn} aria-label="Sign in">
                <User size={20} />
              </Link>
            )}
            <AnimatePresence>
              {accountOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-3xl bg-white p-2 shadow-lift"
                >
                  <p className="px-4 pb-2 pt-3 text-sm text-muted">
                    Signed in as <span className="block truncate font-bold text-olive">{user.name}</span>
                  </p>
                  <Link to="/orders" className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium hover:bg-cream">
                    <Package size={16} /> My orders
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium hover:bg-cream">
                      <Settings size={16} /> Admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-medium hover:bg-cream"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className={`${iconBtn} lg:hidden`} onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute inset-x-0 top-full border-t border-line bg-cream pb-5 pt-4 shadow-soft">
            <div className="container-page max-w-3xl">
              <SearchBar onClose={() => setSearchOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line bg-cream lg:hidden"
          >
            <div className="container-page flex flex-col py-4">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `rounded-2xl px-4 py-3 font-display text-2xl font-bold ${isActive ? 'bg-white' : ''}`}>
                  {l.label}
                </NavLink>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-4">
                {user ? (
                  <>
                    <Link to="/orders" className="chip">
                      My orders
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="chip">
                        Admin
                      </Link>
                    )}
                    <button className="chip" onClick={logout}>
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="chip">
                      Sign in
                    </Link>
                    <Link to="/register" className="chip">
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
