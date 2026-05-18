/** Plain-language labels for zero-knowledge merchants. */

export function profitTier(score: number): { label: string; tone: 'high' | 'mid' | 'low' } {
  const s = Number(score) || 0;
  if (s >= 70) return { label: 'Highly Profitable', tone: 'high' };
  if (s >= 45) return { label: 'Good Margin', tone: 'mid' };
  return { label: 'Thin Margin', tone: 'low' };
}

export function difficultyRating(
  competitionLevel: string,
  riskLevel: string,
): { label: string; easy: boolean } {
  const c = (competitionLevel || '').toUpperCase();
  const r = (riskLevel || '').toUpperCase();
  if (c === 'LOW' && r !== 'HIGH') return { label: 'Easy', easy: true };
  if (c === 'HIGH' || r === 'HIGH') return { label: 'Hard', easy: false };
  return { label: 'Medium', easy: false };
}

export function hypeMeter(relativeInterest: number): { label: string; fill: number } {
  const v = Math.min(100, Math.max(0, Number(relativeInterest) || 0));
  if (v >= 70) return { label: 'Everyone is talking about this', fill: v };
  if (v >= 45) return { label: 'Getting real buzz', fill: v };
  if (v >= 25) return { label: 'Steady chatter', fill: v };
  return { label: 'Quiet for now', fill: v };
}

export function nicheGrade(
  roiPercent: number | null | undefined,
  relativeInterest: number,
  profitPerUnit: number | null | undefined,
): { grade: string; summary: string } {
  const roi = Number(roiPercent) || 0;
  const interest = Number(relativeInterest) || 0;
  const profit = Number(profitPerUnit) || 0;
  const score = Math.min(100, roi * 0.35 + interest * 0.35 + Math.min(profit / 3, 30));
  let grade = 'C';
  if (score >= 82) grade = 'A';
  else if (score >= 68) grade = 'B';
  else if (score >= 52) grade = 'C';
  else if (score >= 38) grade = 'D';
  else grade = 'F';
  const summary =
    grade === 'A' || grade === 'B'
      ? 'Strong niche — worth a test batch.'
      : grade === 'C'
        ? 'Okay idea — validate before scaling.'
        : 'Risky niche — start very small.';
  return { grade, summary };
}

export function momentumArrow(velocity: number, growth14d: number): { direction: 'up' | 'down' | 'flat'; label: string } {
  const v = Number(velocity) || 0;
  const g = Number(growth14d) || 0;
  if (v >= 0.45 || g >= 8) return { direction: 'up', label: 'Rising Fast' };
  if (v < 0.2 && g < 2) return { direction: 'down', label: 'Cooling Off' };
  return { direction: 'flat', label: 'Holding Steady' };
}

export type ProsCons = { pros: string[]; cons: string[] };

export function buildProsCons(t: {
  profit_score: number;
  competition_level: string;
  risk_level: string;
  lifecycle_stage: string;
  predicted_growth_14d: number;
  price_min: number;
  price_max: number;
  suggested_action: string;
}): ProsCons {
  const pros: string[] = [];
  const cons: string[] = [];
  const profit = Number(t.profit_score) || 0;
  const comp = (t.competition_level || '').toUpperCase();
  const risk = (t.risk_level || '').toUpperCase();
  const life = (t.lifecycle_stage || '').toUpperCase();
  const action = (t.suggested_action || '').toUpperCase();

  if (profit >= 55) pros.push('High profit per unit');
  if (comp === 'LOW') pros.push('Low competition');
  if (risk === 'LOW') pros.push('Lower risk profile');
  if (life === 'EMERGING' || life === 'GROWING') pros.push('Still early in the trend');
  if (action === 'SELL') pros.push('Ready to scale');
  if (Number(t.predicted_growth_14d) >= 5) pros.push('Demand still climbing');

  if (profit < 40) cons.push('Thin margins');
  if (comp === 'HIGH') cons.push('Crowded market');
  if (risk === 'HIGH') cons.push('Higher risk');
  if (life === 'DECLINING') cons.push('Trend fading — sell through fast');
  if (life === 'PEAKING') cons.push('Peak hype — may not last long');
  const cap = Number(t.price_max) - Number(t.price_min);
  if (cap > 400 || Number(t.price_min) > 800) cons.push('Needs higher budget to start');

  if (!pros.length) pros.push('Worth a small test order');
  if (!cons.length) cons.push('Watch sell-through before reordering');

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
}

export function humanizeLifecycle(stage: string | undefined | null): string {
  const s = (stage || '').toUpperCase();
  if (s === 'GROWING') return 'gaining popularity';
  if (s === 'PEAKING') return 'very popular right now';
  if (s === 'DECLINING') return 'losing steam';
  if (s === 'EMERGING') return 'just starting to trend';
  return 'on our watch list';
}

export function humanizeAction(action: string | undefined | null): string {
  const a = (action || 'IGNORE').toUpperCase();
  if (a === 'SELL') return 'good time to stock up';
  if (a === 'TEST') return 'worth a small test order';
  return 'better to wait for now';
}

export function humanizeRisk(risk: string | undefined | null): string {
  const r = (risk || 'MEDIUM').toUpperCase();
  if (r === 'LOW') return 'lower risk';
  if (r === 'HIGH') return 'higher risk — go slow';
  return 'medium risk';
}

/** Plain paragraph for trend drawer / previews (ignores raw system reasoning). */
export function trendSnapshotParagraph(t: {
  name?: string | null;
  lifecycle_stage?: string | null;
  suggested_action?: string | null;
  risk_level?: string | null;
  predicted_growth_14d?: number;
  profit_score?: number;
  price_min?: number;
  price_max?: number;
  velocity?: number;
}): string {
  const name = (t.name || 'This product').trim();
  const growth = Number(t.predicted_growth_14d) || 0;
  const momentum = momentumArrow(Number(t.velocity) || 0, growth);
  const profit = profitTier(Number(t.profit_score) || 0);

  const retail =
    Number(t.price_max) > 0
      ? Math.round((Number(t.price_min) + Number(t.price_max)) / 2)
      : Math.max(149, Math.round(Math.sqrt((Number(t.profit_score) || 0) + 100) * 18));
  const cost = Math.round(retail * 0.48);
  const profitEach = Math.max(0, retail - cost);

  return (
    `${name} is ${humanizeLifecycle(t.lifecycle_stage)} and ${momentum.label.toLowerCase()} ` +
    `(about ${growth >= 0 ? '+' : ''}${growth.toFixed(0)}% interest over the next two weeks). ` +
    `We rate it as ${profit.label.toLowerCase()} with ${humanizeRisk(t.risk_level)} — ` +
    `${humanizeAction(t.suggested_action)}. ` +
    `Rough math: buy near ${cost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })} per unit, ` +
    `sell around ${retail.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })}, ` +
    `and keep about ${profitEach.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })} profit per sale if pricing holds.`
  );
}

export function confidenceMatch(allocated: number, budget: number): number {
  if (budget <= 0) return 0;
  const used = allocated / budget;
  if (used >= 0.75 && used <= 0.98) return 95;
  if (used >= 0.5) return 88;
  if (used >= 0.25) return 78;
  return 65;
}
