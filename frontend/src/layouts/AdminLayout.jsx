import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { ExternalLink, LayoutDashboard, LogOut, Mail, Package, ShoppingCart, Tags, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', Icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/categories', label: 'Categories', Icon: Tags },
  { to: '/admin/customers', label: 'Customers', Icon: Users },
  { to: '/admin/messages', label: 'Messages', Icon: Mail },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-[0.95rem] font-medium transition-colors ${isActive ? 'bg-olive text-white' : 'hover:bg-white'}`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-cream lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <Link to="/admin" className="flex items-center gap-3">
            <img src="/images/brand/logo.png" alt="" className="h-12 w-12 lg:h-16 lg:w-16" />
            <span>
              <span className="block font-display text-lg font-bold leading-tight">Little Gifts Story</span>
              <span className="eyebrow text-[0.62rem] text-[#B8935A]">Admin</span>
            </span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible" aria-label="Admin">
          {LINKS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
          <div className="mt-0 flex gap-1 lg:mt-4 lg:flex-col lg:border-t lg:border-line lg:pt-4">
            <Link to="/" className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-[0.95rem] font-medium hover:bg-white">
              <ExternalLink size={17} /> View shop
            </Link>
            <button
              onClick={async () => {
                await logout();
                navigate('/admin/login');
              }}
              className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[0.95rem] font-medium hover:bg-white"
            >
              <LogOut size={17} /> Sign out
            </button>
          </div>
        </nav>
        <p className="hidden px-7 pt-4 text-sm text-muted lg:block">
          Signed in as
          <span className="block truncate font-bold text-olive">{user?.name}</span>
        </p>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-9">
        <Outlet />
      </main>
    </div>
  );
}
