/** Reseller-facing copy and light-weight economics (no extra API round-trips). */

export type MerchantStatus = { label: string; hint: string };

/** Traffic-light hype from velocity (0–1.5 scale). */
export function hypeTraffic(velocity: number): { emoji: string; label: string } {
  const v = Math.min(1.5, Math.max(0, Number(velocity) || 0));
  if (v >= 0.45) return { emoji: '🟢', label: 'Fast mover' };
  if (v >= 0.2) return { emoji: '🟡', label: 'Steady' };
  return { emoji: '🔴', label: 'Slow' };
}

/** Reseller-friendly competition wording. */
export function crowdWords(competitionLevel: string | undefined | null): string {
  const u = (competitionLevel || '').toUpperCase();
  if (u === 'LOW') return 'Wide open';
  if (u === 'HIGH') return 'Saturated';
  return 'Fair';
}

/** Sell-through tier for signal bars (no emoji). */
export type SellThroughSpeed = { bars: 1 | 2 | 3; label: string; hint: string };

export function sellThroughSpeed(velocity: number): SellThroughSpeed {
  const v = Math.min(1.5, Math.max(0, Number(velocity) || 0));
  if (v >= 0.45) return { bars: 3, label: 'Fast', hint: 'Expected to sell out in under 7 days.' };
  if (v >= 0.2) return { bars: 2, label: 'Steady', hint: 'Consistent sales over 14–30 days.' };
  return { bars: 1, label: 'Slow', hint: 'Long-term hold; slow movement.' };
}

export type MarketSaturationTone = 'open' | 'fair' | 'saturated';

export function marketSaturation(competitionLevel: string | undefined | null): {
  label: string;
  detail: string;
  tone: MarketSaturationTone;
} {
  const u = (competitionLevel || '').toUpperCase();
  if (u === 'LOW')
    return {
      label: 'Wide open',
      detail: 'Very few resellers listing this — higher chance of quick sales.',
      tone: 'open',
    };
  if (u === 'HIGH')
    return {
      label: 'Saturated',
      detail: 'Many sellers — expect to compete on price and thinner margins.',
      tone: 'saturated',
    };
  return {
    label: 'Fair',
    detail: 'Some competition, but room for more operators.',
    tone: 'fair',
  };
}

/** Return on capital: profit divided by investment, as a whole percent. */
export function roiOnCapital(invest: number, profit: number): number {
  if (invest <= 0) return 0;
  return Math.min(9999, Math.round((profit / invest) * 100));
}

/** Merchant-facing CTA copy for the catalog row. */
export function merchantRowAction(action: string | undefined | null): string {
  const a = (action || 'IGNORE').toUpperCase();
  if (a === 'TEST') return 'Buy starter pack';
  if (a === 'SELL') return 'Scale inventory';
  return 'Watch / wait';
}

export function merchantStatus(lifecycleStage: string | undefined | null): MerchantStatus {
  const s = (lifecycleStage || 'EMERGING').toUpperCase();
  if (s === 'DECLINING')
    return { label: 'Liquidate', hint: 'Sell remaining stock fast — hype is cooling.' };
  if (s === 'PEAKING')
    return { label: 'Market saturated', hint: 'Many sellers; margins may compress.' };
  if (s === 'GROWING')
    return { label: 'Ride the wave', hint: 'Demand is climbing — still room before the peak.' };
  if (s === 'EMERGING')
    return { label: 'Buy now', hint: 'Get in early before prices or competition spike.' };
  return { label: 'Watch', hint: 'Validate demand before sizing inventory.' };
}

export type UnitEconomics = {
  wholesale: number;
  retail: number;
  profitPerUnit: number;
};

/** Estimated landed cost vs retail when list prices exist; otherwise a stable heuristic from profit score. */
export function unitEconomics(priceMin: number, priceMax: number, profitScore: number): UnitEconomics {
  const pm = Number(priceMin) || 0;
  const px = Number(priceMax) || 0;
  let retailMid = px > 0 ? (pm + px) / 2 : 0;
  if (retailMid <= 0) {
    const ps = Math.max(0, Number(profitScore) || 0);
    retailMid = Math.max(149, Math.min(3999, Math.round(Math.sqrt(ps + 100) * 18)));
  }
  const retail = Math.round(retailMid);
  const wholesale = Math.round(retail * 0.48);
  const profitPerUnit = Math.max(0, retail - wholesale);
  return { wholesale, retail, profitPerUnit };
}

export function parseDefaultUnits(suggestedInventory: string | undefined, action: string): number {
  const s = (suggestedInventory || '').trim();
  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  const one = s.match(/(\d+)/);
  if (one) return Math.max(1, Number(one[1]));
  const a = (action || 'TEST').toUpperCase();
  if (a === 'SELL') return 40;
  if (a === 'TEST') return 12;
  return 8;
}

export function capitalRequired(units: number, wholesale: number): number {
  return Math.round(units * wholesale);
}

export function budgetPercent(capital: number, userBudget: number): number | null {
  if (!userBudget || userBudget <= 0) return null;
  return Math.min(999, Math.round((capital / userBudget) * 100));
}

/** “For every ₱100 you spend, you get ₱X back” (revenue on cost). */
export function cleanRoiPhrase(wholesale: number, retail: number): string {
  if (wholesale <= 0) return '—';
  const back = Math.round((retail / wholesale) * 100);
  return `For every ₱100 you put in at cost, modeled retail is about ₱${back}.`;
}

export function breakEvenUnits(capital: number, profitPerUnit: number): number | null {
  if (profitPerUnit <= 0) return null;
  return Math.max(1, Math.ceil(capital / profitPerUnit));
}

export function estimatedSellThroughDays(velocity: number, growthPct: number): number {
  const v = Math.min(1.5, Math.max(0, Number(velocity) || 0));
  const g = Math.max(0, Number(growthPct) || 0);
  const base = 22 - Math.round(v * 10) - Math.min(8, Math.round(g / 4));
  return Math.max(5, Math.min(45, base));
}

export function stockingPlanLine(action: string, suggestedInventory: string | undefined, velocity: number): string {
  const u = parseDefaultUnits(suggestedInventory, action);
  const a = (action || 'IGNORE').toUpperCase();
  if (a === 'SELL')
    return `Scaling: plan for ${u}+ units while demand outstrips supply — treat it as a fast seller in your snapshot.`;
  if (a === 'TEST') return `Safe start: order about ${u} units to test local interest before you scale.`;
  if (a === 'IGNORE') return 'Hold: we would not deploy new stock here until the picture improves.';
  return `Watch: keep batches small until timing improves.`;
}

export type ShelfBadges = { fastSeller: boolean; highMargin: boolean; lowCompetition: boolean };

export function shelfBadges(velocity: number, profitScore: number, competitionLevel: string): ShelfBadges {
  const comp = (competitionLevel || '').toUpperCase();
  return {
    fastSeller: Number(velocity) >= 0.4,
    highMargin: Number(profitScore) >= 25_000,
    lowCompetition: comp === 'LOW',
  };
}

export function alertToTodoLine(a: { alert_level?: string | null; message?: string | null }): string {
  const m = (a.message || '').trim().replace(/\s+/g, ' ');
  if (m.length <= 100) return m || 'Review this catalog signal.';
  return `${m.slice(0, 97)}…`;
}
