import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMe, fetchTrendDetail, getAccessToken } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import {
  breakEvenUnits,
  budgetPercent,
  capitalRequired,
  estimatedSellThroughDays,
  marketSaturation,
  merchantStatus,
  parseDefaultUnits,
  roiOnCapital,
  stockingPlanLine,
  unitEconomics,
} from '../utils/resellerLedger';
import { GenerateStrategyPanel } from './GenerateStrategyPanel';
import './TrendDetail.css';

type SeriesBlock = { labels: string[]; mentions: number[]; engagement: number[] };
type KeywordCluster = { keyword: string; count: number };

type TrendDetailFull = {
  id?: number;
  name: string;
  category: string;
  product_category: string;
  reasoning: string;
  suggested_action: string;
  profit_score: number;
  competition_score: number;
  competition_level: string;
  risk_level: string;
  lifecycle_stage: string;
  total_engagement: number;
  predicted_growth_14d: number;
  trend_score: number;
  price_min: number;
  price_max: number;
  velocity?: number;
  suggested_inventory?: string;
  series_7d?: SeriesBlock;
  series_30d?: SeriesBlock;
  series_90d?: SeriesBlock;
  keyword_clusters?: KeywordCluster[];
};

function opportunityHeadline(t: TrendDetailFull): string {
  const a = (t.suggested_action || 'IGNORE').toUpperCase();
  if (a === 'SELL') return 'Strong scale opportunity';
  if (a === 'TEST') return 'Strong test opportunity';
  return 'Hold-and-watch posture';
}

function executiveSubhead(t: TrendDetailFull, ue: ReturnType<typeof unitEconomics>, profileBudget: number | null): string {
  const margin = formatPHP(ue.profitPerUnit, false);
  const sat = marketSaturation(t.competition_level);
  const marginClause =
    ue.profitPerUnit >= 100 ? `High margins (${margin}/unit)` : `Modeled margins (${margin}/unit)`;
  const crowd =
    sat.tone === 'open' ? 'with a wide-open market' : sat.tone === 'saturated' ? 'in a saturated market' : 'with fair competition';
  let budgetClause = 'Size buys to the capital you can float.';
  if (profileBudget != null && profileBudget >= 5000) {
    budgetClause = `Recommended for ₱${Math.round(profileBudget / 1000)}k+ budgets.`;
  } else if (profileBudget != null) {
    budgetClause = `Fits your ₱${profileBudget.toLocaleString()} profile budget if batches stay disciplined.`;
  }
  return `${marginClause} ${crowd}. ${budgetClause}`;
}

function demandThermometer(t: TrendDetailFull): { fill: number; status: string; caption: string } {
  const vel = Math.min(1.5, Math.max(0, Number(t.velocity ?? 0))) / 1.5;
  const growth = Math.min(40, Math.max(0, Number(t.predicted_growth_14d))) / 40;
  const eng = Math.min(1, Math.log10(Number(t.total_engagement) + 10) / 5.2);
  const fill = Math.round(Math.min(100, vel * 40 + growth * 35 + eng * 25));
  let status = 'Cold shelf';
  if (fill >= 78) status = 'Viral-ready heat';
  else if (fill >= 58) status = 'Heating up';
  else if (fill >= 42) status = 'Warming';
  else if (fill >= 26) status = 'Steady pulse';
  const g = Number(t.predicted_growth_14d) || 0;
  const caption =
    g >= 3
      ? `Customer interest grew about ${g.toFixed(0)}% in the modeled 14-day window.`
      : 'Lift is modest in the modeled window—keep inventory tight.';
  return { fill, status, caption };
}

type RiskTone = 'low' | 'med' | 'high';

function riskLandscape(t: TrendDetailFull): { label: string; tone: RiskTone; text: string }[] {
  const comp = (t.competition_level || '').toUpperCase();
  const density: RiskTone = comp === 'LOW' ? 'low' : comp === 'HIGH' ? 'high' : 'med';
  const densityText =
    density === 'low'
      ? 'Fewer major sellers crowding this niche in your snapshot.'
      : density === 'high'
        ? 'Many competing listings—discovery is noisier.'
        : 'Balanced crowd levels.';
  const priceWar: RiskTone =
    comp === 'HIGH' && Number(t.velocity ?? 0) < 0.28 ? 'high' : comp === 'HIGH' ? 'med' : 'low';
  const priceText =
    priceWar === 'high'
      ? 'Promo cycles may erode list price faster.'
      : priceWar === 'med'
        ? 'Watch for discounting if velocity cools.'
        : 'List band looks comparatively stable in the catalog read.';
  const life = (t.lifecycle_stage || '').toUpperCase();
  let hype: RiskTone = 'med';
  let hypeText = 'Trend relevance should hold for a typical season window.';
  if (life === 'DECLINING') {
    hype = 'high';
    hypeText = 'Lifecycle is cooling—plan exit timing, not long holds.';
  } else if (life === 'EMERGING' || life === 'GROWING') {
    hype = 'low';
    hypeText = 'Still early enough that demand can run for a couple of months if buyers follow.';
  } else if (life === 'PEAKING') {
    hype = 'med';
    hypeText = 'Peak attention—expect trend power to soften over the next weeks.';
  }
  return [
    { label: 'Market density', tone: density, text: densityText },
    { label: 'Price war risk', tone: priceWar, text: priceText },
    { label: 'Hype longevity', tone: hype, text: hypeText },
  ];
}

function gameplanSteps(
  t: TrendDetailFull,
  L: { units: number; ue: ReturnType<typeof unitEconomics>; sellDays: number },
): { title: string; body: string }[] {
  const comp = (t.competition_level || '').toUpperCase();
  const a = (t.suggested_action || 'IGNORE').toUpperCase();
  const listPrice = Math.max(Math.round(L.ue.retail) - 1, Math.round(L.ue.wholesale + 10));
  const low = Math.max(5, L.sellDays - 5);
  const high = L.sellDays + 7;
  const buy =
    a === 'SELL'
      ? `Scale with at least ${L.units} units while demand is strongest—keep supply lines short.`
      : a === 'IGNORE'
        ? 'Do not add fresh units until the catalog signal improves—watch from the sidelines.'
        : `Secure about ${L.units} units for a low-risk test before you re-order.`;
  const price =
    a === 'IGNORE'
      ? 'Skip new listings until momentum returns; protect working capital elsewhere.'
      : comp === 'LOW'
        ? `List around ${formatPHP(listPrice, false)} to stay competitive while demand still clears easily.`
        : `Anchor near ${formatPHP(listPrice, false)}; expect to defend margin if rivals run sales.`;
  const timeline =
    a === 'IGNORE'
      ? 'No sell-through target—stay out until the pulse improves.'
      : `Expect sell-through near ${low}–${high} days if local buyers mirror this catalog pace.`;
  return [
    { title: 'The buy', body: buy },
    { title: 'The price', body: price },
    { title: 'The timeline', body: timeline },
  ];
}

function buildRawDataLine(t: TrendDetailFull): string {
  return [
    `Demand (total engagement): ${Number(t.total_engagement).toLocaleString()}`,
    `Competition score: ${Number(t.competition_score).toFixed(2)} (${t.competition_level})`,
    `Profit score: ${Number(t.profit_score).toFixed(1)}`,
    `Forecast 14d: ${Number(t.predicted_growth_14d).toFixed(1)}%`,
    `List prices: ${Number(t.price_min).toFixed(0)}–${Number(t.price_max).toFixed(0)}`,
    `Action: ${t.suggested_action} · Risk: ${t.risk_level}`,
    t.suggested_inventory ? `Suggested stock: ${t.suggested_inventory}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function DeepDive({ summary }: { summary: string }) {
  return (
    <span className="td-deep-dive" tabIndex={0}>
      <span className="td-deep-dive-label">Raw figures</span>
      <span className="td-deep-dive-tip" role="tooltip">
        {summary}
      </span>
    </span>
  );
}

export function TrendDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const savedTrends: string[] = JSON.parse(localStorage.getItem('savedTrends') || '[]');
    setSaved(savedTrends.includes(id));
  }, [id]);

  const token = getAccessToken();

  const { data: trend, isPending, isError } = useQuery({
    queryKey: ['trend', id],
    queryFn: () => fetchTrendDetail(id!),
    enabled: Boolean(id),
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
  });

  const ledger = useMemo(() => {
    const tr = trend as TrendDetailFull | undefined;
    if (!tr) return null;
    const vel = Number(tr.velocity ?? 0);
    const ue = unitEconomics(tr.price_min, tr.price_max, tr.profit_score);
    const units = parseDefaultUnits(tr.suggested_inventory, tr.suggested_action);
    const cap = capitalRequired(units, ue.wholesale);
    const budget = me?.budget != null ? Number(me.budget) : null;
    const pct = budget != null && budget > 0 ? budgetPercent(cap, budget) : null;
    const be = breakEvenUnits(cap, ue.profitPerUnit);
    const sellDays = estimatedSellThroughDays(vel, tr.predicted_growth_14d);
    const merchant = merchantStatus(tr.lifecycle_stage);
    const stockLine = stockingPlanLine(tr.suggested_action, tr.suggested_inventory, vel);
    return { ue, units, cap, pct, budget, be, sellDays, merchant, stockLine };
  }, [trend, me?.budget]);

  const toggleSave = () => {
    if (!id) return;
    const savedTrends: string[] = JSON.parse(localStorage.getItem('savedTrends') || '[]');
    if (saved) {
      localStorage.setItem('savedTrends', JSON.stringify(savedTrends.filter((tId) => tId !== id)));
      setSaved(false);
    } else {
      savedTrends.push(id);
      localStorage.setItem('savedTrends', JSON.stringify(savedTrends));
      setSaved(true);
    }
  };

  if (isPending)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-surface font-body text-base font-medium text-on-surface-variant">
        Loading trend…
      </div>
    );
  if (isError || !trend) return <div className="p-12 text-center text-error">Trend not found.</div>;

  const t = trend as TrendDetailFull;
  const tags = (t.keyword_clusters ?? []).slice(0, 10);
  const L = ledger!;
  const rawLine = buildRawDataLine(t);
  const opp = opportunityHeadline(t);
  const sub = executiveSubhead(t, L.ue, L.budget);
  const unitRoi = roiOnCapital(L.ue.wholesale, L.ue.profitPerUnit);
  const roiNote =
    unitRoi >= 90
      ? 'Your money nearly doubles on this modeled spread.'
      : unitRoi >= 50
        ? 'Strong return per peso at landed cost.'
        : 'Keep volume disciplined until the spread widens.';
  const pulse = demandThermometer(t);
  const risks = riskLandscape(t);
  const steps = gameplanSteps(t, { units: L.units, ue: L.ue, sellDays: L.sellDays });

  return (
    <div className="td-magazine min-h-full bg-[var(--td-canvas)] pb-20 font-body text-on-surface">
      {showStrategy && <GenerateStrategyPanel onClose={() => setShowStrategy(false)} />}

      <main className="td-main td-blueprint mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-10">
        <header className="td-masthead">
          <div className="td-masthead-top">
            <Link to="/trends" className="td-back">
              Trend Explorer
            </Link>
            <div className="td-masthead-actions">
              <button type="button" onClick={toggleSave} className={`td-text-btn ${saved ? 'td-text-btn--active' : ''}`}>
                {saved ? 'Saved' : 'Save trend'}
              </button>
            </div>
          </div>
        </header>

        <section className="td-executive" aria-labelledby="td-exec-heading">
          <p className="td-executive-meta">
            {t.category} · {t.product_category}
          </p>
          <h1 id="td-exec-heading" className="td-executive-title font-headline">
            {t.name}: {opp}
          </h1>
          <p className="td-executive-sub">{sub}</p>
          <p className="td-executive-foot font-tabular">
            Open about <strong>{formatPHP(L.cap, false)}</strong> with ~{L.units} units
            {L.pct != null && L.budget != null ? (
              <>
                {' '}
                — <strong>{L.pct}%</strong> of your {formatPHP(L.budget, false)} profile budget.
              </>
            ) : null}
            {' · '}
            Break-even near <strong>{L.be ?? '—'}</strong> units on that buy-in.
          </p>
        </section>

        <section className="td-merchant-ledger" aria-label="Merchant ledger">
          <div className="td-ledger-strip">
            <div className="td-ledger-cell">
              <span className="td-ledger-k">Estimated cost</span>
              <span className="td-ledger-v font-tabular">{formatPHP(L.ue.wholesale, false)}/unit</span>
            </div>
            <span className="td-ledger-divider" aria-hidden />
            <div className="td-ledger-cell">
              <span className="td-ledger-k">Estimated retail</span>
              <span className="td-ledger-v font-tabular">{formatPHP(L.ue.retail, false)}/unit</span>
            </div>
            <span className="td-ledger-divider" aria-hidden />
            <div className="td-ledger-cell">
              <span className="td-ledger-k">Net profit</span>
              <span className="td-ledger-v td-ledger-v--profit font-tabular">{formatPHP(L.ue.profitPerUnit, false)}/unit</span>
            </div>
            <span className="td-ledger-divider" aria-hidden />
            <div className="td-ledger-cell td-ledger-cell--roi">
              <span className="td-ledger-k">ROI</span>
              <span className="td-ledger-v font-tabular">{unitRoi}%</span>
              <span className="td-ledger-note">{roiNote}</span>
            </div>
          </div>
          <p className="td-ledger-hint">
            <span className="font-medium text-on-background">{L.merchant.label}</span> — {L.merchant.hint} {L.stockLine}
          </p>
        </section>

        <div className="td-blueprint-split">
          <section className="td-market-pulse" aria-labelledby="td-pulse-heading">
            <h2 id="td-pulse-heading" className="td-blueprint-h2 font-headline">
              Market pulse
            </h2>
            <p className="td-blueprint-lead">Cold to viral — one read on momentum, not a mention chart.</p>
            <div className="td-thermo" role="img" aria-label={`Demand level about ${pulse.fill} percent`}>
              <div className="td-thermo-labels">
                <span>Cold</span>
                <span>Viral</span>
              </div>
              <div className="td-thermo-track">
                <div className="td-thermo-fill" style={{ width: `${pulse.fill}%` }} />
              </div>
            </div>
            <p className="td-thermo-status">
              <strong>Status:</strong> {pulse.status} — {pulse.caption}
            </p>
          </section>

          <section className="td-risk-guard" aria-labelledby="td-risk-heading">
            <h2 id="td-risk-heading" className="td-blueprint-h2 font-headline">
              Competition landscape
            </h2>
            <p className="td-blueprint-lead">Plain-language risk scan — no abstract scores.</p>
            <ul className="td-risk-list">
              {risks.map((r) => (
                <li key={r.label} className={`td-risk-line td-risk-line--${r.tone}`}>
                  <span className="td-risk-label">{r.label}</span>
                  <span className="td-risk-level">{r.tone === 'low' ? 'Low' : r.tone === 'high' ? 'High' : 'Medium'}</span>
                  <span className="td-risk-text">{r.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="td-gameplan" aria-labelledby="td-gameplan-heading">
          <h2 id="td-gameplan-heading" className="td-blueprint-h2 font-headline">
            Inventory gameplan
          </h2>
          <p className="td-blueprint-lead">Three moves that turn this read into shelf instructions.</p>
          <ol className="td-gameplan-steps">
            {steps.map((s, i) => (
              <li key={s.title} className="td-gameplan-step">
                <span className="td-gameplan-num font-tabular">{i + 1}</span>
                <div>
                  <p className="td-gameplan-title font-headline">{s.title}</p>
                  <p className="td-gameplan-body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="td-blueprint-foot">
          <div className="td-blueprint-visual">
            <img src={trendHeroImage(t)} alt="" className="td-blueprint-img" />
          </div>
          <div className="td-blueprint-meta">
            {tags.length ? (
              <div className="td-keywords td-keywords--compact">
                <p className="td-keywords-label">Search clusters</p>
                <ul className="td-keyword-list">
                  {tags.map((tag) => (
                    <li key={tag.keyword} className="td-keyword-chip" title={`${tag.count} mentions in data`}>
                      {tag.keyword}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="td-raw-inline">
              <DeepDive summary={rawLine} />
            </p>
          </div>
        </div>

        <section className="td-action-hub" aria-labelledby="td-action-heading">
          <div className="td-action-hub-inner">
            <h3 id="td-action-heading" className="td-action-title">
              <span className="td-action-icon material-symbols-outlined" aria-hidden>
                rocket_launch
              </span>
              Next steps
            </h3>
            <p className="td-action-sub">Turn this read into inventory moves or supplier follow-up.</p>
            <div className="td-action-buttons">
              <button type="button" onClick={() => setShowStrategy(true)} className="td-action-primary">
                Generate strategy
              </button>
              <Link to="/opportunities" className="td-action-secondary">
                Secure supplier links
              </Link>
              <Link to={`/ai-analyst?trend=${encodeURIComponent(t.name)}`} className="td-action-tertiary">
                Ask the AI analyst
              </Link>
              <button type="button" onClick={() => navigate('/trends')} className="td-action-ghost">
                Back to catalog
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="td-footer">
        <div className="td-footer-inner mx-auto max-w-[1200px] px-5 md:px-8">
          <span className="td-footer-brand">TrendPulse</span>
          <nav className="td-footer-nav">
            <Link to="/dashboard">Command Center</Link>
            <Link to="/trends">Explorer</Link>
            <Link to="/ai-analyst">Analyst</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
