import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchMe, fetchOpportunities, fetchTrends, getAccessToken, saveFinderStrategy } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import { marketSaturation, sellThroughSpeed, unitEconomics } from '../utils/resellerLedger';
import { TrendProductCard } from './TrendProductCard';
import './TrendExplorer.css';

function SignalBars({ bars }: { bars: 1 | 2 | 3 }) {
  return (
    <span className="te-signal" data-bars={bars} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`te-signal-bar ${i < bars ? 'te-signal-bar--on' : ''}`} />
      ))}
    </span>
  );
}

type TrendRow = {
  id: number;
  name: string;
  image_url?: string | null;
  category: string;
  product_category: string;
  lifecycle_stage: string;
  trend_score: number;
  velocity: number;
  suggested_action: string;
  risk_level: string;
  profit_score: number;
  competition_score: number;
  competition_level: string;
  entry_timing: string;
  predicted_growth_14d: number;
  price_min: number;
  price_max: number;
  suggested_inventory?: string;
};

type OppItem = {
  trend_id?: number | null;
  trend_name: string;
  image_url?: string | null;
  action: string;
  allocation: number;
  units: number;
  risk: string;
  profit_score?: number;
};

type OppResult = { budget: number; remaining_budget: number; recommended_products: OppItem[] };

type StrategicLens = 'none' | 'quick_wins' | 'steady_growth' | 'high_stakes';

function passesLens(row: TrendRow, lens: StrategicLens, highStakesMinProfit: number): boolean {
  if (lens === 'none') return true;
  const v = Number(row.velocity ?? 0);
  const comp = (row.competition_level || '').toUpperCase();
  const life = (row.lifecycle_stage || '').toUpperCase();
  const risk = (row.risk_level || '').toUpperCase();
  if (lens === 'quick_wins') return v >= 0.35 && comp === 'LOW';
  if (lens === 'steady_growth') return life === 'EMERGING' && risk === 'LOW';
  if (lens === 'high_stakes') {
    const profit = Number(row.profit_score ?? 0);
    return comp === 'HIGH' && profit >= highStakesMinProfit;
  }
  return true;
}

function bundleMetrics(chunk: OppItem[], trendList: TrendRow[]): { cost: number; upside: number } {
  let cost = 0;
  let upside = 0;
  for (const p of chunk) {
    cost += Number(p.allocation) || 0;
    const tr = trendList.find((t) => t.id === p.trend_id);
    const ue = tr
      ? unitEconomics(tr.price_min, tr.price_max, tr.profit_score)
      : unitEconomics(0, 0, Number(p.profit_score ?? 0));
    upside += (Number(p.units) || 0) * ue.profitPerUnit;
  }
  return { cost, upside: Math.round(upside) };
}

export function TrendExplorer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getAccessToken();
  const [budget, setBudget] = useState('15000');
  const seededBudget = useRef(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [strategicLens, setStrategicLens] = useState<StrategicLens>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [skippedIds, setSkippedIds] = useState<Set<number>>(() => new Set());
  const lastAnalyzedBudgetRef = useRef<string | null>(null);
  const [budgetWatchActive, setBudgetWatchActive] = useState(false);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe, enabled: Boolean(token) });
  useEffect(() => {
    const b = meQuery.data?.budget;
    if (b == null || seededBudget.current) return;
    setBudget(String(Math.max(1, Math.round(Number(b)))));
    seededBudget.current = true;
  }, [meQuery.data?.budget]);

  const saveMutation = useMutation({
    mutationFn: async (payload: OppResult) => {
      const picks = payload.recommended_products
        .filter((p) => p.trend_id != null)
        .map((p) => ({ trend_id: Number(p.trend_id), allocation: p.allocation, profit_score: Number(p.profit_score ?? 0) }));
      if (!picks.length) throw new Error('No trend IDs to save.');
      return saveFinderStrategy(picks);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userRecommendations'] }),
  });

  const oppMutation = useMutation({
    mutationFn: () => fetchOpportunities(Number(budget) || 15000, 3),
    onSuccess: () => {
      saveMutation.reset();
      lastAnalyzedBudgetRef.current = String(budget);
      setBudgetWatchActive(true);
    },
  });

  const trendsQuery = useQuery({
    queryKey: ['trends', { limit: 50 }],
    queryFn: () => fetchTrends({ limit: 50 }),
  });

  const trends: TrendRow[] = trendsQuery.data?.items ?? [];

  const highStakesMinProfit = useMemo(() => {
    const profits = trends.map((t) => Number(t.profit_score ?? 0)).sort((a, b) => b - a);
    if (profits.length < 2) return 0;
    const idx = Math.floor(profits.length * 0.35);
    return profits[idx] ?? 0;
  }, [trends]);

  const lensFiltered = useMemo(() => {
    return trends.filter((row) => {
      const okF = activeFilter === 'ALL' || row.suggested_action === activeFilter;
      const okL = passesLens(row, strategicLens, highStakesMinProfit);
      return okF && okL;
    });
  }, [trends, activeFilter, strategicLens, highStakesMinProfit]);

  const tableRows = useMemo(
    () => lensFiltered.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [lensFiltered, searchQuery],
  );

  const galleryTop3 = useMemo(() => {
    return [...lensFiltered].sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0)).slice(0, 3);
  }, [lensFiltered]);

  const results = oppMutation.data as OppResult | undefined;
  const bundleChunks = useMemo(() => {
    const prods = results?.recommended_products ?? [];
    if (!prods.length) return [] as OppItem[][];
    const out: OppItem[][] = [];
    for (let i = 0; i < prods.length; i += 3) {
      out.push(prods.slice(i, i + 3));
    }
    return out;
  }, [results?.recommended_products]);

  const allocatedSum = useMemo(() => {
    return (results?.recommended_products ?? []).reduce((s, p) => s + (Number(p.allocation) || 0), 0);
  }, [results?.recommended_products]);

  const utilPct = useMemo(() => {
    if (!results || results.budget <= 0) return 0;
    return Math.min(100, Math.round((allocatedSum / results.budget) * 100));
  }, [results, allocatedSum]);

  useEffect(() => {
    if (!budgetWatchActive || lastAnalyzedBudgetRef.current == null) return;
    const t = window.setTimeout(() => {
      const b = budget.trim();
      if (!b || Number(b) < 1) return;
      if (b === lastAnalyzedBudgetRef.current) return;
      oppMutation.mutate();
    }, 750);
    return () => window.clearTimeout(t);
  }, [budget, budgetWatchActive, oppMutation]);

  const oppErr = oppMutation.isError ? 'Analysis failed. Try again.' : null;
  const saveErr = saveMutation.isError && saveMutation.error instanceof Error ? saveMutation.error.message : null;

  return (
    <div className="min-h-full bg-surface pb-24 font-body text-on-surface te-explorer">
      <main className="mx-auto w-full max-w-7xl px-1 py-6 md:px-0 md:py-8">
        <section className="mb-6 max-w-2xl">
          <p className="te-kicker">Sourcing catalog</p>
          <h1 className="te-page-title">Browse trends</h1>
          <p className="te-page-lead">
            Swipe-style product cards — tap Interested to save or Skip to hide. Tap See math only when you want the numbers.
          </p>
        </section>

        <div className="te-sticky-budget">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              oppMutation.mutate();
            }}
            className="te-sticky-budget-inner"
          >
            <div className="te-budget-field">
              <label htmlFor="te-budget-input" className="te-budget-label">
                Your budget
              </label>
              <div className="te-budget-control">
                <span className="te-budget-currency">₱</span>
                <input
                  id="te-budget-input"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="te-budget-input font-tabular"
                  placeholder="15000"
                />
                <button type="submit" disabled={oppMutation.isPending} className="te-budget-analyze">
                  {oppMutation.isPending ? '…' : 'Analyze'}
                </button>
              </div>
            </div>

            {results && results.budget > 0 ? (
              <div className="te-budget-util">
                <div className="te-budget-util-bar" role="progressbar" aria-valuenow={utilPct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="te-budget-util-fill" style={{ width: `${utilPct}%` }} />
                </div>
                <p className="te-budget-util-copy font-tabular">
                  You&apos;re allocating <strong>{formatPHP(allocatedSum, false)}</strong> of your{' '}
                  <strong>{formatPHP(results.budget, false)}</strong> in this mix. Remaining:{' '}
                  <strong>{formatPHP(results.remaining_budget, false)}</strong>.
                </p>
              </div>
            ) : (
              <p className="te-budget-oracle-hint">Run Analyze to see budget fill and remaining buying power for the top mix.</p>
            )}

            <div className="te-budget-actions">
              {token && results?.recommended_products?.length ? (
                <>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(results)}
                    className="te-save-strategy"
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save strategy'}
                  </button>
                  {saveMutation.isSuccess && (
                    <span className="te-save-ok font-tabular">Saved {saveMutation.data?.saved ?? 0} picks.</span>
                  )}
                  {saveErr && <span className="text-xs text-error">{saveErr}</span>}
                </>
              ) : null}
              <Link to="/opportunities" className="te-budget-link">
                Opportunity finder
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
            {oppErr && <p className="text-xs text-error">{oppErr}</p>}
            {token && meQuery.data?.budget != null && <p className="te-profile-hint">Profile budget loads into the field on first visit.</p>}
          </form>
        </div>

        {bundleChunks.length > 0 && (
          <section className="te-bundle-section" aria-label="Your Shopping List">
            <h2 className="te-section-title">Your Shopping List</h2>
            <p className="te-section-sub">Balanced bundles of products that fit your budget — better than betting on just one item.</p>
            <div className="te-bundle-grid">
              {bundleChunks.map((chunk, bi) => {
                const { cost, upside } = bundleMetrics(chunk, trends);
                const title = bi === 0 ? 'Starter mix' : `Bundle ${bi + 1}`;
                return (
                  <article key={bi} className="te-bundle-card">
                    <h3 className="te-bundle-name">{title}</h3>
                    <ul className="te-bundle-lines">
                      {chunk.map((p) => (
                        <li key={`${p.trend_id}-${p.trend_name}`} className="font-tabular">
                          <strong>{p.units}</strong> × {p.trend_name}
                        </li>
                      ))}
                    </ul>
                    <p className="te-bundle-total font-tabular">
                      Total cost <strong>{formatPHP(cost, false)}</strong>
                    </p>
                    <p className="te-bundle-upside font-tabular">
                      Estimated modeled upside <span className="te-money-in">{formatPHP(upside, false)}</span>
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {galleryTop3.length > 0 && (
          <section className="te-gallery-section" aria-label="Hottest Products">
            <h2 className="te-section-title">Hottest Products</h2>
            <p className="te-section-sub">These items are moving fast. Check the price gap and estimated profit.</p>
            <div className="te-gallery-grid">
              {galleryTop3.map((row) => {
                const ue = unitEconomics(row.price_min, row.price_max, row.profit_score);
                const speed = sellThroughSpeed(row.velocity ?? 0);
                const sat = marketSaturation(row.competition_level);
                return (
                  <article key={row.id} className="te-gallery-card te-gallery-card--quiet">
                    <button type="button" className="te-gallery-card-hit" onClick={() => navigate(`/trends/${row.id}`)}>
                      <div className="te-gallery-image-wrap">
                        <img src={trendHeroImage(row)} alt="" className="te-gallery-image" />
                        <span className="te-gallery-price-tag font-tabular">
                          {formatPHP(ue.wholesale, false)} → {formatPHP(ue.retail, false)} →{' '}
                          <span className="te-money-in">{formatPHP(ue.profitPerUnit, false)}</span>
                        </span>
                      </div>
                      <div className="te-gallery-body">
                        <h3 className="te-gallery-name">{row.name}</h3>
                        <p className="te-gallery-meta-row">
                          <SignalBars bars={speed.bars} />
                          <span className="te-gallery-meta-copy">
                            {speed.label} · {sat.label}
                          </span>
                        </p>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section id="catalog" className="scroll-mt-28 te-catalog-section">
          <h2 className="te-section-title">Full Catalog</h2>
          <p className="te-section-sub mb-4">Search and filter every trend in our database.</p>

          <div className="te-lens-row" role="group" aria-label="What is your goal?">
            {(
              [
                { id: 'none' as const, label: 'Show All' },
                { id: 'quick_wins' as const, label: 'Easy Wins ✨' },
                { id: 'steady_growth' as const, label: 'Safe Growth 📈' },
                { id: 'high_stakes' as const, label: 'Big Rewards 💰' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStrategicLens(chip.id)}
                className={`te-lens-chip ${strategicLens === chip.id ? 'te-lens-chip--on' : ''}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <p className="te-lens-hint mb-4 text-xs text-on-surface-variant">
            Easy Wins: Fast sellers with low competition. Big Rewards: Highly popular items with great profit potential.
          </p>

          <div className="rounded-2xl bg-surface-container-low p-4 md:p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex max-w-md flex-1 items-center gap-3 rounded-full border border-[#EEF2F6] bg-surface-container-lowest px-4 py-2.5">
                <Search size={16} className="text-on-surface-variant" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trends…"
                  className="w-full border-none bg-transparent text-sm font-medium text-on-background outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Action filter">
                {[
                  { id: 'ALL', label: 'All Items' },
                  { id: 'SELL', label: 'Ready to Scale' },
                  { id: 'TEST', label: 'New Tests' },
                  { id: 'IGNORE', label: 'Wait/Skip' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={`te-filter-chip ${activeFilter === f.id ? 'te-filter-chip--on' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

            </div>

            <div className="overflow-x-auto rounded-xl bg-surface-container-lowest">
              {trendsQuery.isPending ? (
                <div className="p-12 text-center text-on-surface-variant">Loading trends…</div>
              ) : tableRows.filter((r) => !skippedIds.has(r.id)).length === 0 ? (
                <p className="p-8 text-center text-on-surface-variant">No trends match — try another filter or search.</p>
              ) : (
                <div className="te-card-feed">
                  {tableRows
                    .filter((r) => !skippedIds.has(r.id))
                    .map((row) => (
                      <TrendProductCard
                        key={row.id}
                        row={row}
                        onSkip={() => setSkippedIds((prev) => new Set(prev).add(row.id))}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
