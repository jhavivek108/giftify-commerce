import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { WhatsAppIcon } from '../components/ui';
import { whatsappLink, BRAND_NAME } from '../utils/whatsapp';

export default function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-olive focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Navbar />
        <motion.main
          id="main"
          key={location.pathname}
          className="flex-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Outlet />
        </motion.main>
      <Footer />
      <CartDrawer />
      <a
        href={whatsappLink(`Hi ${BRAND_NAME}! I have a question.`)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-white shadow-lift transition-transform hover:scale-105"
      >
        <WhatsAppIcon size={28} />
      </a>
    </div>
  );
}
