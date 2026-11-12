import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import { LoadingSpinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';

// Everything except the home page is loaded on demand to keep the first visit fast.
const Shop = lazy(() => import('./pages/Shop'));
const Collections = lazy(() => import('./pages/Collections'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Auth = lazy(() => import('./pages/Auth'));
const PrivacyPolicy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.PrivacyPolicy })));
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })));
const NotFound = lazy(() => import('./pages/Legal').then((m) => ({ default: m.NotFound })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminMessages = lazy(() => import('./pages/admin/Messages'));

/** Sends visitors to sign in first. `admin` additionally requires the admin role. */
function Protected({ children, admin = false }) {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingSpinner className="min-h-[50vh]" />;
  if (!user) return <Navigate to={admin ? '/admin/login' : '/login'} replace state={{ from: location.pathname }} />;
  if (admin && !isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<LoadingSpinner className="min-h-screen" />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:categorySlug" element={<Shop />} />
            <Route path="collections" element={<Collections />} />
            <Route path="product/:slug" element={<ProductDetails />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success/:orderNumber" element={<OrderSuccess />} />
            <Route
              path="orders"
              element={
                <Protected>
                  <MyOrders />
                </Protected>
              }
            />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="login" element={<Auth mode="login" />} />
            <Route path="register" element={<Auth mode="register" />} />
            <Route path="admin/login" element={<Auth mode="admin" />} />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
            <Route path="terms-and-conditions" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            path="admin"
            element={
              <Protected admin>
                <AdminLayout />
              </Protected>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="messages" element={<AdminMessages />} />
          </Route>
        </Routes>
      </Suspense>
    </MotionConfig>
  );
}
