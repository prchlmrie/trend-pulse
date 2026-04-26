export function formatPHP(value, isMultiplier = false) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  // If explicitly a score/multiplier, calculate mock profit
  const displayValue = isMultiplier ? (numericValue <= 1 ? numericValue * 100000 : numericValue) : numericValue;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(displayValue);
}

export function getRandomProductImage(trendName) {
  const name = (trendName || '').toLowerCase();
  if (name.includes('hoodie')) return '/products/hoodie_streetwear_1777188898165.png';
  if (name.includes('tote')) return '/products/tote_bag_canvas_1777188977082.png';
  if (name.includes('tshirt') || name.includes('tee')) return '/products/oversized_tshirt_1777189021119.png';
  if (name.includes('bag')) return '/products/crossbody_bag_1777189033838.png';
  
  // fallback to a default image
  return '/products/hoodie_streetwear_1777188898165.png';
}
