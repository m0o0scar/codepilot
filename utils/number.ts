export const format = (n: number, zeroPlaceholder = '-') => {
  if (!n) return zeroPlaceholder || '0';
  if (n < 1000) return n;
  if (n < 1_000_000) return (n / 1_000).toFixed(1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
};

export const formatFileSize = (n: number) => {
  if (n < 1024) return n + ' bytes';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
};
