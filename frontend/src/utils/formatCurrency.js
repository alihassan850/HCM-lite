export function formatCurrency(amount, currency = 'PKR') {
  if (amount === null || amount === undefined || isNaN(amount)) return 'PKR 0.00';
  const formatted = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currency} ${formatted}`;
}

export function formatCompactCurrency(amount) {
  if (!amount || isNaN(amount)) return 'PKR 0';
  if (amount >= 1000000) {
    return `PKR ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `PKR ${(amount / 1000).toFixed(1)}k`;
  }
  return `PKR ${amount}`;
}
