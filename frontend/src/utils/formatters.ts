export function formatPHP(value: number | string, isMultiplier = false): string {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const displayValue = isMultiplier
    ? numericValue <= 1
      ? numericValue * 100000
      : numericValue
    : numericValue;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(displayValue);
}

export function getRandomProductImage(trendName: string | null | undefined): string {
  const name = (trendName || '').toLowerCase();
  if (name.includes('hoodie')) return '/products/hoodie_streetwear_1777188898165.png';
  if (name.includes('tote')) return '/products/tote_bag_canvas_1777188977082.png';
  if (name.includes('tshirt') || name.includes('tee')) return '/products/oversized_tshirt_1777189021119.png';
  if (name.includes('bag')) return '/products/crossbody_bag_1777189033838.png';
  return '/products/hoodie_streetwear_1777188898165.png';
}

/** Prefer API `image_url` (set at pipeline time); fall back to local heuristic art. */
export function trendHeroImage(row: { image_url?: string | null; name?: string | null } | null | undefined): string {
  const u = row?.image_url?.trim();
  if (u) return u;
  return getRandomProductImage(row?.name ?? '');
}
