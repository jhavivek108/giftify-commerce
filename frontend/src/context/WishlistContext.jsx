import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { wishlistApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

/** Wishlist: saved in MongoDB for signed-in customers, in localStorage for guests (merged on login). */
const WishlistContext = createContext(null);
const LOCAL_KEY = 'lgs_wishlist_v1';

const readLocal = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function WishlistProvider({ children }) {
  const { user, ready } = useAuth();
  const { success, error } = useToast();
  const [localItems, setLocalItems] = useState(readLocal);
  const [serverItems, setServerItems] = useState([]);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localItems));
  }, [localItems]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setServerItems([]);
      return;
    }
    let alive = true;
    const pending = readLocal();
    const load = pending.length ? wishlistApi.merge(pending.map((p) => p._id)) : wishlistApi.get();
    load
      .then((data) => {
        if (!alive) return;
        setServerItems(data.items || []);
        if (pending.length) setLocalItems([]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, ready]);

  const items = user ? serverItems : localItems;
  const ids = useMemo(() => new Set(items.map((p) => p._id)), [items]);
  const has = useCallback((productId) => ids.has(productId), [ids]);

  const toggle = useCallback(
    async (product) => {
      const saved = ids.has(product._id);
      if (user) {
        try {
          const data = saved ? await wishlistApi.remove(product._id) : await wishlistApi.add(product._id);
          setServerItems(data.items || []);
        } catch (e) {
          error(e.message);
          return;
        }
      } else {
        setLocalItems((list) => (saved ? list.filter((p) => p._id !== product._id) : [...list, product]));
      }
      success(saved ? 'Removed from your wishlist' : `${product.name} saved to your wishlist`);
    },
    [ids, user, success, error]
  );

  const value = useMemo(() => ({ items, count: items.length, has, toggle }), [items, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
