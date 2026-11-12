/**
 * Manual payment: the customer pays outside the site (UPI / bank transfer
 * arranged over WhatsApp) and an admin confirms it by hand.
 */
export const manualProvider = {
  id: 'manual',
  label: 'UPI / bank transfer (confirmed manually)',
  isEnabled: () => true,

  /** Called when an order is placed. Stays pending until an admin confirms the money arrived. */
  async initiate() {
    return { paymentStatus: 'pending', paymentReference: '' };
  },

  async verify() {
    return { verified: false };
  },
};
