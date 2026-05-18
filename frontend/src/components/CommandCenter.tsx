import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDashboardSummary, fetchMe, getAccessToken } from '../api/client';
import { profitTier } from '../utils/merchantFriendly';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import {
  alertToTodoLine,
  capitalRequired,
  merchantStatus,
  parseDefaultUnits,
  shelfBadges,
  unitEconomics,
} from '../utils/resellerLedger';
import { GenerateStrategyPanel } from './GenerateStrategyPanel';
import { TrendPreviewDrawer } from './TrendPreviewDrawer';
import './CommandCenter.css';

type Opp = {
  trend_id: number;
  trend_name: string;
  image_url?: string | null;
  velocity?: number;
  suggested_action: string;
  trend_score: number;
  profit_score: number;
  predicted_growth_14d: number;
  competition_level: string;
  lifecycle_stage?: string;
  price_min?: number;
  price_max?: number;
  suggested_inventory?: string;
};

type AlertRow = {
  id: number;
  trend_id?: number | null;
  alert_level: string;
  message: string;
  created_at: string;
};

function TodoFeed({
  visibleAlerts,
  hasMoreAlerts,
  alertsExpanded,
  setAlertsExpanded,
  allAlertsLength,
  onAlertTrend,
}: {
  visibleAlerts: AlertRow[];
  hasMoreAlerts: boolean;
  alertsExpanded: boolean;
  setAlertsExpanded: (fn: (e: boolean) => boolean) => void;
  allAlertsLength: number;
  onAlertTrend: (trendId: number) => void;
}) {
  return (
    <div className="cc-intelligence-inner">
      <div className="cc-intelligence-header">
        <h3 className="cc-intelligence-title">To-do list</h3>
        <span className="cc-intelligence-caption">From your latest signals</span>
      </div>
      <div className="cc-alert-stack">
        {visibleAlerts.map((alert) => {
          const line = alertToTodoLine(alert);
          const inner = (
            <>
              <div className="cc-todo-dot" aria-hidden />
              <div className="cc-alert-copy">
                <p className="cc-todo-title">{line}</p>
              </div>
            </>
          );
          if (alert.trend_id != null) {
            return (
              <button key={alert.id} type="button" onClick={() => onAlertTrend(alert.trend_id!)} className="cc-alert-row cc-todo-row">
                {inner}
              </button>
            );
          }
          return (
            <div key={alert.id} className="cc-alert-row cc-alert-row--static cc-todo-row">
              {inner}
            </div>
          );
        })}
      </div>
      {hasMoreAlerts && (
        <button type="button" onClick={() => setAlertsExpanded((e) => !e)} className="cc-intelligence-more">
          {alertsExpanded ? 'Show fewer' : `View all (${allAlertsLength})`}
        </button>
      )}
    </div>
  );
}

function ShelfStrip({ wholesale, retail, profit }: { wholesale: number; retail: number; profit: number }) {
  return (
    <p className="cc-shelf-strip font-tabular">
      <span className="cc-shelf-muted">Cost</span> {formatPHP(wholesale, false)}
      <span className="cc-shelf-arrow" aria-hidden>
        →
      </span>
      <span className="cc-shelf-muted">Retail</span> {formatPHP(retail, false)}
      <span className="cc-shelf-arrow" aria-hidden>
        →
      </span>
      <span className="cc-shelf-muted">Est. profit</span> <span className="cc-shelf-profit">{formatPHP(profit, false)}</span>
    </p>
  );
}

function buyingPlanParagraph(
  hot: Opp,
  economics: {
    units: number;
    wholesale: number;
    retail: number;
    profitPerUnit: number;
    cap: number;
  },
  capital: number | null,
  totalProfit: number,
): string {
  const status = merchantStatus(hot.lifecycle_stage);
  const action = (hot.suggested_action || 'IGNORE').toUpperCase();
  const units = economics.units;

  let actionAdvice =
    'Start with a small test batch first, then order more if sales go well.';
  if (action === 'SELL') {
    actionAdvice = 'Signals look strong — this is a good time to stock up.';
  } else if (action === 'IGNORE') {
    actionAdvice = 'We would wait on new stock until the trend picks up again.';
  }

  let budgetNote = '';
  if (capital != null && capital > 0) {
    const pct = Math.min(100, Math.round((economics.cap / capital) * 100));
    budgetNote = ` That is about ${pct}% of your ${formatPHP(capital, false)} budget.`;
  }

  return (
    `${hot.trend_name} is ${status.label.toLowerCase()} right now (${status.hint}). ` +
    `To try it, buy around ${units} units for about ${formatPHP(economics.cap, false)} total ` +
    `(roughly ${formatPHP(economics.wholesale, false)} per item). ` +
    `If you sell near ${formatPHP(economics.retail, false)} each, you keep about ${formatPHP(economics.profitPerUnit, false)} profit per item — ` +
    `about ${formatPHP(totalProfit, false)} if everything sells.${budgetNote} ${actionAdvice}`
  );
}

function ShelfBadgesRow({ badges }: { badges: ReturnType<typeof shelfBadges> }) {
  const items: string[] = [];
  if (badges.fastSeller) items.push('Fast seller');
  if (badges.highMargin) items.push('High margin');
  if (badges.lowCompetition) items.push('Low competition');
  if (!items.length) return null;
  return (
    <div className="cc-shelf-badges">
      {items.map((b) => (
        <span key={b} className="cc-shelf-badge">
          {b}
        </span>
      ))}
    </div>
  );
}

export function CommandCenter() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const [showStrategy, setShowStrategy] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [drawerTrendId, setDrawerTrendId] = useState<number | null>(null);

  const { data: summary, isPending, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
  });

  const openTrend = (id: number) => setDrawerTrendId(id);

  const opps: Opp[] = summary?.top_opportunities ?? [];
  const hot = opps[0];
  const hotEconomics = useMemo(() => {
    if (!hot) return null;
    const ue = unitEconomics(Number(hot.price_min ?? 0), Number(hot.price_max ?? 0), Number(hot.profit_score ?? 0));
    const units = parseDefaultUnits(hot.suggested_inventory, hot.suggested_action);
    const cap = capitalRequired(units, ue.wholesale);
    return { ...ue, units, cap, badges: shelfBadges(hot.velocity ?? 0, hot.profit_score, hot.competition_level) };
  }, [hot]);

  if (isPending && !summary)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-surface font-body text-base font-medium text-on-surface-variant">
        Loading your hub…
      </div>
    );
  if (isError || !summary)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-surface font-body text-on-error">
        Failed to load dashboard.
      </div>
    );

  const secondaryOpps = opps.slice(1, 8);
  const lc = summary.lifecycle_counts;
  const allAlerts = (summary.live_alerts as AlertRow[]) ?? [];
  const visibleAlerts = alertsExpanded ? allAlerts : allAlerts.slice(0, 5);
  const hasMoreAlerts = allAlerts.length > 5;
  const buyWindow = (lc.emerging ?? 0) + (lc.growing ?? 0);
  const capital = me?.budget != null && me.budget > 0 ? Number(me.budget) : null;
  const monthlyGoal = capital != null && capital > 0 ? capital * 2 : 20000;
  const heroProfit =
    hot && hotEconomics ? Math.round(hotEconomics.profitPerUnit * hotEconomics.units) : 0;
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((heroProfit / monthlyGoal) * 100)) : 0;
  const storyItems = opps.slice(0, 6);
  const activeTrends = Number(summary.active_trends_count ?? 0);
  const dreamNumber = Number(summary.total_catalog_profit_potential ?? 0);

  return (
    <div className="cc-cockpit min-h-full bg-[var(--canvas-main)] pb-20 font-body text-on-surface selection:bg-secondary-container selection:text-on-background">
      {showStrategy && <GenerateStrategyPanel onClose={() => setShowStrategy(false)} />}
      <TrendPreviewDrawer trendId={drawerTrendId} onClose={() => setDrawerTrendId(null)} />

      {storyItems.length > 0 && (
        <section className="cc-stories" aria-label="New hot items">
          <div className="cc-stories-head">
            <div>
              <h2 className="cc-stories-title font-headline">New hot items</h2>
              <p className="cc-stories-sub">Tap a product for a quick preview</p>
            </div>
            <Link to="/trends" className="cc-stories-link">
              Browse all
            </Link>
          </div>
          <div className="cc-stories-track" role="list">
            {storyItems.map((sig, index) => {
              const ue = unitEconomics(
                Number(sig.price_min ?? 0),
                Number(sig.price_max ?? 0),
                Number(sig.profit_score ?? 0),
              );
              const tier = profitTier(Number(sig.profit_score ?? 0));
              const badge =
                index === 0 ? 'Top pick' : tier.tone === 'high' ? 'Hot' : tier.tone === 'mid' ? 'Solid' : 'Watch';
              return (
                <button
                  key={sig.trend_id}
                  type="button"
                  role="listitem"
                  className="cc-story-card"
                  onClick={() => openTrend(sig.trend_id)}
                >
                  <span className="cc-story-media">
                    <img src={trendHeroImage({ image_url: sig.image_url, name: sig.trend_name })} alt="" />
                    <span className={`cc-story-badge cc-story-badge--${index === 0 ? 'top' : tier.tone}`}>{badge}</span>
                  </span>
                  <span className="cc-story-name">{sig.trend_name}</span>
                  <span className="cc-story-meta font-tabular">Est. {formatPHP(ue.profitPerUnit, false)} profit/unit</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <header className="cc-pulse-bar cc-pulse-bar--compact" hidden>
        <div className="cc-pulse-bar-inner">
          <div className="cc-pulse-live" title="Catalog is updating">
            <span className="cc-pulse-dot-wrap">
              <span className="cc-pulse-dot-ping" />
              <span className="cc-pulse-dot" />
            </span>
            <span className="cc-pulse-live-label">Live</span>
          </div>
          <div className="cc-pulse-counts" aria-label="Merchant snapshot">
            <span title="Early demand — move before prices spike">
              <strong className="cc-pulse-num cc-pulse-num--emerge">{String(buyWindow).padStart(2, '0')}</strong>
              <span className="cc-pulse-word"> early bird</span>
            </span>
            <span className="cc-pulse-sep" aria-hidden>
              ·
            </span>
            <span title="Crowded window — margins may thin">
              <strong className="cc-pulse-num">{String(lc.peaking).padStart(2, '0')}</strong>
              <span className="cc-pulse-word"> very popular</span>
            </span>
            <span className="cc-pulse-sep" aria-hidden>
              ·
            </span>
            <span title="Clear stock while attention lasts">
              <strong className="cc-pulse-num cc-pulse-num--decline">{String(lc.declining).padStart(2, '0')}</strong>
              <span className="cc-pulse-word"> fading out</span>
            </span>
          </div>
        </div>
      </header>

      <div className="cc-cockpit-grid">
        <div className="cc-stage">
          <div className="cc-stage-intro">
            <h1 className="cc-hero-title">Daily briefing</h1>
            <p className="cc-hero-lead">One clear move for today — browse hot items above or check your to-do list.</p>
          </div>

          <section className="cc-goal-card" aria-label="Monthly profit goal">
            <div className="cc-goal-head">
              <span className="cc-goal-label">Monthly profit goal</span>
              <span className="cc-goal-pct font-tabular">{goalPct}% reached</span>
            </div>
            <div className="cc-goal-bar" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="cc-goal-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="cc-goal-hint">
              {hot && hotEconomics
                ? `Top pick could add about ${formatPHP(heroProfit, false)} toward a ${formatPHP(monthlyGoal, false)} target.`
                : `Aim for ${formatPHP(monthlyGoal, false)} this month — run Find New Trends to refresh picks.`}
            </p>
          </section>

          {hot && hotEconomics ? (
            <article className="cc-briefing-card">
              <p className="cc-briefing-kicker">Today&apos;s best move</p>
              <h2 className="cc-briefing-headline">
                Buy about {hotEconomics.units} units of &ldquo;{hot.trend_name}&rdquo;
              </h2>
              <p className="cc-briefing-profit font-tabular">
                You could make roughly <strong>{formatPHP(heroProfit, false)}</strong> profit.
              </p>
              <button type="button" onClick={() => openTrend(hot.trend_id)} className="cc-briefing-cta">
                See the plan
              </button>
            </article>
          ) : null}

          <div className="cc-kpi-row cc-kpi-row--three cc-kpi-row--hidden">
            <div className="cc-kpi-card">
              <p className="cc-kpi-label">Spending Money</p>
              <p className="cc-kpi-value font-tabular">{capital != null ? formatPHP(capital, false) : '—'}</p>
              <p className="cc-kpi-hint">{capital != null ? 'Your current budget for new stock.' : 'Set a budget in your profile to see what you can afford.'}</p>
            </div>
            <div className="cc-kpi-card">
              <p className="cc-kpi-label">Tracked Trends</p>
              <p className="cc-kpi-value font-tabular">{activeTrends}</p>
              <p className="cc-kpi-hint">Products we are watching for you.</p>
            </div>
            <div className="cc-kpi-card">
              <p className="cc-kpi-label">Potential Earnings</p>
              <p className="cc-kpi-value font-tabular cc-kpi-value--money">{formatPHP(dreamNumber, false)}</p>
              <p className="cc-kpi-hint">Total estimated profit if you sell everything.</p>
            </div>
          </div>

          <div className="cc-stage-head">
            <div>
              <p className="cc-eyebrow">Top shelf pick</p>
              <h2 className="cc-stage-heading">Best opportunity right now</h2>
            </div>
            <button type="button" onClick={() => setShowStrategy(true)} className="cc-link-btn">
              Build a buying strategy
            </button>
          </div>

          {hot && hotEconomics ? (
            <article className="cc-primary-card">
              <div className="cc-primary-visual">
                <img className="cc-primary-img" src={trendHeroImage({ image_url: hot.image_url, name: hot.trend_name })} alt="" />
                <span className="cc-primary-badge">{merchantStatus(hot.lifecycle_stage).label}</span>
              </div>
              <div className="cc-primary-body">
                <h3 className="cc-primary-name">{hot.trend_name}</h3>
                <p className="cc-primary-summary">
                  {buyingPlanParagraph(hot, hotEconomics, capital, heroProfit)}
                </p>
                <button type="button" onClick={() => openTrend(hot.trend_id)} className="cc-primary-cta">
                  View full details
                </button>
              </div>
            </article>
          ) : (
            <div className="cc-empty-card">No opportunities yet. In the sidebar footer, run Refresh catalog (pipeline).</div>
          )}

          {secondaryOpps.length > 0 && (
            <section className="cc-rec-block">
              <h3 className="cc-rec-heading">More shelf picks</h3>
              <p className="cc-rec-sub">Same ranking as your catalog — cost → retail → profit on every card.</p>
              <div className="cc-rec-scroll">
                {secondaryOpps.map((sig) => {
                  const ue = unitEconomics(Number(sig.price_min ?? 0), Number(sig.price_max ?? 0), Number(sig.profit_score ?? 0));
                  const badges = shelfBadges(sig.velocity ?? 0, sig.profit_score, sig.competition_level);
                  return (
                    <button key={sig.trend_id} type="button" onClick={() => openTrend(sig.trend_id)} className="cc-rec-card cc-rec-card--shelf">
                      <div className="cc-rec-shelf-img-wrap">
                        <img src={trendHeroImage({ image_url: sig.image_url, name: sig.trend_name })} alt="" className="cc-rec-thumb" />
                        <span className="cc-rec-tag">{merchantStatus(sig.lifecycle_stage).label}</span>
                      </div>
                      <div className="cc-rec-body">
                        <span className="cc-rec-name">{sig.trend_name}</span>
                        <ShelfBadgesRow badges={badges} />
                        <ShelfStrip wholesale={ue.wholesale} retail={ue.retail} profit={ue.profitPerUnit} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <button type="button" onClick={() => navigate('/trends')} className="cc-browse-all">
            Open sourcing catalog
          </button>

          <aside className="cc-intelligence cc-intelligence--mobile">
            <TodoFeed
              visibleAlerts={visibleAlerts}
              hasMoreAlerts={hasMoreAlerts}
              alertsExpanded={alertsExpanded}
              setAlertsExpanded={setAlertsExpanded}
              allAlertsLength={allAlerts.length}
              onAlertTrend={(id) => openTrend(id)}
            />
          </aside>
        </div>

        <aside className="cc-intelligence cc-intelligence--desktop" aria-label="To-do list">
          <TodoFeed
            visibleAlerts={visibleAlerts}
            hasMoreAlerts={hasMoreAlerts}
            alertsExpanded={alertsExpanded}
            setAlertsExpanded={setAlertsExpanded}
            allAlertsLength={allAlerts.length}
            onAlertTrend={(id) => openTrend(id)}
          />
        </aside>
      </div>
    </div>
  );
}
