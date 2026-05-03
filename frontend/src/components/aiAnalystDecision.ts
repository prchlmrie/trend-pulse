import { formatPHP } from '../utils/formatters';
import { crowdWords, sellThroughSpeed, type UnitEconomics } from '../utils/resellerLedger';

export type Verdict = 'buy' | 'wait' | 'skip';

export type TrendDetailLike = {
  lifecycle_stage?: string;
  risk_level?: string;
  profit_score?: number;
  velocity?: number;
  competition_level?: string;
  predicted_growth_14d?: number;
  price_min?: number;
  price_max?: number;
};

export function verdictFromTrend(t: TrendDetailLike): Verdict {
  const life = (t.lifecycle_stage || '').toUpperCase();
  const risk = (t.risk_level || '').toUpperCase();
  const comp = (t.competition_level || '').toUpperCase();
  const ps = Number(t.profit_score ?? 0);
  const vel = Number(t.velocity ?? 0);
  if (life === 'DECLINING' || risk === 'HIGH') return 'skip';
  if (life === 'PEAKING' && comp === 'HIGH' && ps < 0.5) return 'wait';
  if (ps >= 0.55 && vel >= 0.2 && risk !== 'HIGH') return 'buy';
  return 'wait';
}

export function buildWhyBullets(t: TrendDetailLike, ue: UnitEconomics): string[] {
  const crowd = crowdWords(t.competition_level);
  const speed = sellThroughSpeed(Number(t.velocity ?? 0));
  const g = Number(t.predicted_growth_14d ?? 0);
  const b1 =
    crowd === 'Wide open'
      ? 'Wide-open competition — room to win share before others pile in.'
      : crowd === 'Saturated'
        ? 'Saturated shelf — expect promos and thinner margins.'
        : 'Fair competition — price and sourcing still matter.';
  const b2 = `Modeled margin about ${formatPHP(ue.profitPerUnit, false)} per unit at list pricing.`;
  const b3 =
    g >= 5
      ? `${speed.label} sell-through with ~${g.toFixed(0)}% modeled lift over the next two weeks.`
      : `${speed.label} sell-through; 14-day modeled interest is modest (~${g.toFixed(0)}%).`;
  return [b1, b2, b3];
}

export function whatIfFromCapital(capital: number, ue: UnitEconomics): { units: number; netProfit: number } {
  const c = Math.max(0, capital);
  if (ue.wholesale <= 0) return { units: 0, netProfit: 0 };
  const units = Math.floor(c / ue.wholesale);
  const netProfit = Math.round(units * ue.profitPerUnit);
  return { units, netProfit };
}
