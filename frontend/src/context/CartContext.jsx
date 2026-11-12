import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

/**
 * Cart state.
 * - Signed-in customers: the cart lives in MongoDB (server is the source of truth).
 * - Guests: the cart lives in localStorage and is merged into the server cart on login.
 * Both are exposed through the same item shape so the UI does not care which one it is.
 */
const CartContext = createContext(null);
const LOCAL_KEY = 'lgs_cart_v1';
export const MAX_QTY = 20;

const readLocal = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const lineKey = (productId, variantId, colour, customisation) =>
  JSON.stringify([productId, variantId || '', colour || '', customisation?.instructions || '', customisation?.message || '']);

const clampQty = (q, max = MAX_QTY) => Math.max(1, Math.min(max, Math.floor(Number(q) || 1)));

const localToItems = (lines) =>
  lines.map((l) => ({
    _id: l.key,
    product: l.product,
    variantId: l.variantId || null,
    size: l.size || null,
    colour: l.colour || null,
    quantity: l.quantity,
    customisation: l.customisation || {},
    unitPrice: l.unitPrice,
    lineTotal: l.unitPrice * l.quantity,
    available: true,
    maxQuantity: MAX_QTY,
  }));

export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const { success, error } = useToast();
  const [localLines, setLocalLines] = useState(readLocal);
  const [serverCart, setServerCart] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localLines));
  }, [localLines]);

  // When the customer signs in, move the guest cart to their account.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setServerCart(null);
      return;
    }
    let alive = true;
    const pending = readLocal();
    const load = pending.length
      ? cartApi.merge(
          pending.map((l) => ({
            productId: l.product._id,
            variantId: l.variantId || undefined,
            colour: l.colour || undefined,
            quantity: l.quantity,
            customisation: l.customisation,
          }))
        )
      : cartApi.get();
    load
      .then((cart) => {
        if (!alive) return;
        setServerCart(cart);
        if (pending.length) setLocalLines([]);
      })
      .catch(() => alive && setServerCart({ items: [], subtotal: 0, itemCount: 0 }));
    return () => {
      alive = false;
    };
  }, [user, ready]);

  const items = useMemo(() => (user ? serverCart?.items || [] : localToItems(localLines)), [user, serverCart, localLines]);
  const purchasable = useMemo(() => items.filter((i) => i.available !== false), [items]);
  const subtotal = useMemo(() => purchasable.reduce((sum, i) => sum + i.lineTotal, 0), [purchasable]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const run = useCallback(
    async (fn) => {
      setBusy(true);
      try {
        setServerCart(await fn());
        return true;
      } catch (e) {
        error(e.message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [error]
  );

  const addItem = useCallback(
    async (product, { variantId, colour, quantity = 1, customisation, silent } = {}) => {
      if (!product?.inStock) {
        error('Sorry, this item is unavailable right now.');
        return false;
      }
      const variant = product.variants?.find((v) => v._id === variantId);
      if (product.hasVariants && !variant) {
        error('Please choose a size first.');
        return false;
      }
      const qty = clampQty(quantity);
      const custom = {
        instructions: customisation?.instructions?.trim() || '',
        message: customisation?.message?.trim() || '',
      };
      let ok = true;
      if (user) {
        ok = await run(() =>
          cartApi.add({
            productId: product._id,
            variantId: variant?._id,
            colour: colour || undefined,
            quantity: qty,
            customisation: custom,
          })
        );
      } else {
        const key = lineKey(product._id, variant?._id, colour, custom);
        setLocalLines((lines) => {
          const existing = lines.find((l) => l.key === key);
          if (existing) {
            return lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(l.quantity + qty) } : l));
          }
          return [
            ...lines,
            {
              key,
              product: {
                _id: product._id,
                name: product.name,
                slug: product.slug,
                images: product.images?.slice(0, 1) || [],
                priceUnit: product.priceUnit,
                category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
              },
              variantId: variant?._id || null,
              size: variant?.size || null,
              colour: colour || null,
              quantity: qty,
              customisation: custom,
              unitPrice: variant ? variant.price : product.basePrice,
            },
          ];
        });
      }
      if (ok && !silent) {
        success(`${product.name} added to your cart`);
        setDrawerOpen(true);
      }
      return ok;
    },
    [user, run, success, error]
  );

  const updateQuantity = useCallback(
    (itemId, quantity) => {
      const item = items.find((i) => i._id === itemId);
      const qty = clampQty(quantity, item?.maxQuantity || MAX_QTY);
      if (user) return run(() => cartApi.update(itemId, { quantity: qty }));
      setLocalLines((lines) => lines.map((l) => (l.key === itemId ? { ...l, quantity: qty } : l)));
      return Promise.resolve(true);
    },
    [user, run, items]
  );

  const removeItem = useCallback(
    (itemId) => {
      if (user) return run(() => cartApi.remove(itemId));
      setLocalLines((lines) => lines.filter((l) => l.key !== itemId));
      return Promise.resolve(true);
    },
    [user, run]
  );

  /** Called after a successful order: the server already emptied a signed-in customer's cart. */
  const clearCart = useCallback(async () => {
    setLocalLines([]);
    if (user) {
      try {
        setServerCart(await cartApi.clear());
      } catch {
        setServerCart({ items: [], subtotal: 0, itemCount: 0 });
      }
    }
  }, [user]);

  /** Shape the backend expects in POST /orders (prices are always recomputed server-side). */
  const orderItems = useMemo(
    () =>
      purchasable.map((i) => ({
        productId: i.product._id,
        variantId: i.variantId || undefined,
        colour: i.colour || undefined,
        quantity: i.quantity,
        customisation: i.customisation,
      })),
    [purchasable]
  );

  const value = useMemo(
    () => ({
      items,
      purchasable,
      subtotal,
      itemCount,
      busy,
      orderItems,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, purchasable, subtotal, itemCount, busy, orderItems, drawerOpen, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
