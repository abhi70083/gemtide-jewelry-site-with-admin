export const formatPrice = (amount: number) =>
  `\u20b9${amount.toLocaleString('en-IN')}`;

export const effectivePrice = (price: number, offer: number) =>
  Math.round(price * (1 - offer / 100));
