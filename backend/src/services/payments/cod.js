/** Cash on delivery: money is collected by the courier / on handover. */
export const codProvider = {
  id: 'cod',
  label: 'Cash on delivery',
  isEnabled: () => true,

  /** Called when an order is placed. COD never starts as paid. */
  async initiate() {
    return { paymentStatus: 'pending', paymentReference: '' };
  },

  /** Nothing to verify online: an admin marks the order paid once cash is received. */
  async verify() {
    return { verified: false };
  },
};
