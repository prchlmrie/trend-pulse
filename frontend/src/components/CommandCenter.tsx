import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary, fetchMe, getAccessToken } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import {
  alertToTodoLine,
  capitalRequired,
  merchantStatus,
  parseDefaultUnits,
  shelfBadges,
  stockingPlanLine,
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
  const activeTrends = Number(summary.active_trends_count ?? 0);
  const dreamNumber = Number(summary.total_catalog_profit_potential ?? 0);

  return (
    <div className="cc-cockpit min-h-full bg-[var(--canvas-main)] pb-20 font-body text-on-surface selection:bg-secondary-container selection:text-on-background">
      {showStrategy && <GenerateStrategyPanel onClose={() => setShowStrategy(false)} />}
      <TrendPreviewDrawer trendId={drawerTrendId} onClose={() => setDrawerTrendId(null)} />

      <header className="cc-pulse-bar">
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
              <span className="cc-pulse-word"> buy window</span>
            </span>
            <span className="cc-pulse-sep" aria-hidden>
              ·
            </span>
            <span title="Crowded window — margins may thin">
              <strong className="cc-pulse-num">{String(lc.peaking).padStart(2, '0')}</strong>
              <span className="cc-pulse-word"> saturated</span>
            </span>
            <span className="cc-pulse-sep" aria-hidden>
              ·
            </span>
            <span title="Clear stock while attention lasts">
              <strong className="cc-pulse-num cc-pulse-num--decline">{String(lc.declining).padStart(2, '0')}</strong>
              <span className="cc-pulse-word"> liquidate</span>
            </span>
          </div>
        </div>
      </header>

      <div className="cc-cockpit-grid">
        <div className="cc-stage">
          <div className="cc-stage-intro">
            <h1 className="cc-hero-title">Daily profit opportunities</h1>
            <p className="cc-hero-lead">
              One hero pick, shelf math at a glance, and a short to-do list from your signals. Refresh data with{' '}
              <strong className="text-on-background">Generate Trend</strong> in the sidebar.
            </p>
          </div>

          <div className="cc-kpi-row cc-kpi-row--three">
            <div className="cc-kpi-card">
              <p className="cc-kpi-label">Capital available</p>
              <p className="cc-kpi-value font-tabular">{capital != null ? formatPHP(capital, false) : '—'}</p>
              <p className="cc-kpi-hint">{capital != null ? 'From your profile budget.' : 'Sign in and set a budget to track impact.'}</p>
            </div>
            <div className="cc-kpi-card">
              <p className="cc-kpi-label">Active trends</p>
              <p className="cc-kpi-value font-tabular">{activeTrends}</p>
              <p className="cc-kpi-hint">Rows in your live catalog.</p>
            </div>
            <div className="cc-kpi-card">
              <p className="cc-kpi-label">Catalog profit pool</p>
              <p className="cc-kpi-value font-tabular cc-kpi-value--money">{formatPHP(dreamNumber, false)}</p>
              <p className="cc-kpi-hint">Sum of modeled profit scores across insights.</p>
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
                <ShelfBadgesRow badges={hotEconomics.badges} />
                <ShelfStrip wholesale={hotEconomics.wholesale} retail={hotEconomics.retail} profit={hotEconomics.profitPerUnit} />
                <p className="cc-primary-stock font-body text-sm leading-relaxed text-on-surface-variant">
                  {stockingPlanLine(hot.suggested_action, hot.suggested_inventory, hot.velocity ?? 0)}
                </p>
                <p className="cc-primary-cap font-tabular text-sm text-on-background">
                  About <strong>{formatPHP(hotEconomics.cap, false)}</strong> to enter at ~{hotEconomics.units} units (est. landed cost).
                  {capital != null && capital > 0 ? (
                    <>
                      {' '}
                      That is roughly <strong>{Math.min(100, Math.round((hotEconomics.cap / capital) * 100))}%</strong> of your{' '}
                      {formatPHP(capital, false)} budget.
                    </>
                  ) : null}
                </p>
                <button type="button" onClick={() => openTrend(hot.trend_id)} className="cc-primary-cta">
                  Open buying plan
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
