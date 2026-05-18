import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrendDetail } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import { humanizeAction, humanizeRisk, momentumArrow, profitTier, trendSnapshotParagraph } from '../utils/merchantFriendly';
import { merchantStatus, unitEconomics } from '../utils/resellerLedger';
import './TrendPreviewDrawer.css';

type Props = {
  trendId: number | null;
  onClose: () => void;
};

export function TrendPreviewDrawer({ trendId, onClose }: Props) {
  const navigate = useNavigate();
  const open = trendId != null;

  const { data: trend, isPending, isError } = useQuery({
    queryKey: ['trend', String(trendId ?? '')],
    queryFn: () => fetchTrendDetail(trendId!),
    enabled: open && trendId != null,
  });

  const summary = useMemo(() => {
    if (!trend) return '';
    return trendSnapshotParagraph(trend as Parameters<typeof trendSnapshotParagraph>[0]);
  }, [trend]);

  const ue = useMemo(() => {
    if (!trend) return null;
    return unitEconomics(
      Number(trend.price_min ?? 0),
      Number(trend.price_max ?? 0),
      Number(trend.profit_score ?? 0),
    );
  }, [trend]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const goFull = () => {
    onClose();
    navigate(`/trends/${trendId}`);
  };

  const momentum = trend
    ? momentumArrow(Number(trend.velocity ?? 0), Number(trend.predicted_growth_14d ?? 0))
    : null;
  const profit = trend ? profitTier(Number(trend.profit_score ?? 0)) : null;
  const status = trend ? merchantStatus(trend.lifecycle_stage as string) : null;

  return (
    <div className="tp-drawer-root" role="dialog" aria-modal="true" aria-labelledby="tp-drawer-title">
      <button type="button" className="tp-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <div className="tp-drawer-panel">
        <div className="tp-drawer-panel-inner">
          <div className="tp-drawer-toolbar">
            <p className="tp-drawer-toolbar-label">Quick look</p>
            <button type="button" className="tp-drawer-close" onClick={onClose} aria-label="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {isPending && (
            <div className="tp-drawer-body tp-drawer-body--centered font-headline text-sm font-semibold text-on-surface-variant">
              Loading…
            </div>
          )}
          {isError && (
            <div className="tp-drawer-body tp-drawer-body--centered text-sm text-error">Could not load this trend.</div>
          )}
          {trend && !isPending && !isError && (
            <div className="tp-drawer-body">
              <div className="tp-drawer-hero">
                <img src={trendHeroImage(trend)} alt="" className="tp-drawer-hero-img" />
                {status && <span className="tp-drawer-badge">{status.label}</span>}
              </div>
              <h2 id="tp-drawer-title" className="tp-drawer-title">
                {trend.name ?? 'Trend'}
              </h2>
              <div className="tp-drawer-chips">
                {momentum && (
                  <span className={`tp-drawer-chip tp-drawer-chip--${momentum.direction}`}>{momentum.label}</span>
                )}
                {profit && <span className={`tp-drawer-chip tp-drawer-chip--profit-${profit.tone}`}>{profit.label}</span>}
                <span className="tp-drawer-chip">{humanizeAction(trend.suggested_action as string)}</span>
                <span className="tp-drawer-chip">{humanizeRisk(trend.risk_level as string)}</span>
              </div>
              {ue && (
                <p className="tp-drawer-math font-tabular">
                  About {formatPHP(ue.wholesale, false)} cost → {formatPHP(ue.retail, false)} sell →{' '}
                  {formatPHP(ue.profitPerUnit, false)} profit each
                </p>
              )}
              <p className="tp-drawer-reasoning">{summary}</p>
              <div className="tp-drawer-actions">
                <button type="button" className="tp-drawer-btn tp-drawer-btn--primary" onClick={goFull}>
                  View full details
                </button>
                <button type="button" className="tp-drawer-btn tp-drawer-btn--ghost" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
