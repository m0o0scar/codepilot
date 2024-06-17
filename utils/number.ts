export const format = (n: number) => {
  if (!n) return '0';
  if (n < 1000) return n;
  if (n < 1_000_000) return (n / 1_000).toFixed(1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
};
