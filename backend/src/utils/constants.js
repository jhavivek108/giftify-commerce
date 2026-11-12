export const ROLES = ['customer', 'admin'];
export const CATEGORY_THEMES = ['pink', 'yellow', 'lavender', 'blue', 'mint', 'peach'];
export const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
/** Orders in these states can no longer change status. */
export const FINAL_ORDER_STATUSES = ['delivered', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'manual'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
export const CONTACT_TYPES = ['general', 'business'];
export const MAX_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 50;
export const MAX_ORDER_LINES = 50;
