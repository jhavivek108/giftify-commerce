import { addLine, assertQuantityAvailable, buildCartResponse, getOrCreateCart } from '../services/cartService.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { lineItem } from '../validators/common.js';

export async function getCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  ok(res, await buildCartResponse(cart));
}

export async function addToCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  await addLine(cart, req.valid.body);
  await cart.save();
  ok(res, await buildCartResponse(cart), 'Added to cart');
}

export async function updateCartItem(req, res) {
  const { quantity, colour, customisation } = req.valid.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.valid.params.itemId);
  if (!item) throw ApiError.notFound('Cart item not found');

  if (quantity !== undefined) {
    // Lowering the quantity is always allowed; raising it needs stock.
    if (quantity > item.quantity) await assertQuantityAvailable(item, quantity);
    item.quantity = quantity;
  }
  if (colour !== undefined) item.colour = colour ?? '';
  if (customisation !== undefined) {
    item.customisation = {
      instructions: customisation.instructions ?? '',
      message: customisation.message ?? '',
    };
  }

  await cart.save();
  ok(res, await buildCartResponse(cart), 'Cart updated');
}

export async function removeCartItem(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.valid.params.itemId);
  if (!item) throw ApiError.notFound('Cart item not found');

  cart.items.pull(item._id);
  await cart.save();
  ok(res, await buildCartResponse(cart), 'Removed from cart');
}

export async function clearCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  ok(res, await buildCartResponse(cart), 'Cart cleared');
}

/** Merges a guest's browser cart into the server cart after login. Bad lines are skipped. */
export async function mergeCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  let skipped = 0;

  for (const raw of req.valid.body.items) {
    const parsed = lineItem.safeParse(raw);
    const added = parsed.success && (await addLine(cart, parsed.data, { strict: false }));
    if (!added) skipped += 1;
  }

  await cart.save();
  const message = skipped > 0 ? `Cart merged. ${skipped} unavailable item${skipped === 1 ? ' was' : 's were'} skipped.` : 'Cart merged';
  ok(res, await buildCartResponse(cart), message);
}
