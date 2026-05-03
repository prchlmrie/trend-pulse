import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrendDetail } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
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

  return (
    <div className="tp-drawer-root" role="dialog" aria-modal="true" aria-labelledby="tp-drawer-title">
      <button type="button" className="tp-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <div className="tp-drawer-panel">
        <div className="tp-drawer-panel-inner">
          <div className="tp-drawer-toolbar">
            <p className="tp-drawer-toolbar-label">Trend snapshot</p>
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
              </div>
              <h2 id="tp-drawer-title" className="tp-drawer-title">
                {trend.name ?? 'Trend'}
              </h2>
              <p className="tp-drawer-meta">
                {trend.lifecycle_stage} · {trend.suggested_action}
              </p>
              <dl className="tp-drawer-stats">
                <div>
                  <dt>Growth (14d)</dt>
                  <dd>+{Number(trend.predicted_growth_14d).toFixed(0)}%</dd>
                </div>
                <div>
                  <dt>Profit score</dt>
                  <dd>{formatPHP(trend.profit_score, true)}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{trend.risk_level}</dd>
                </div>
              </dl>
              {(trend.reasoning || '').trim() ? (
                <p className="tp-drawer-reasoning">{(trend.reasoning as string).slice(0, 280)}{(trend.reasoning as string).length > 280 ? '…' : ''}</p>
              ) : null}
              <div className="tp-drawer-actions">
                <button type="button" className="tp-drawer-btn tp-drawer-btn--primary" onClick={goFull}>
                  Open full trend page
                </button>
                <button type="button" className="tp-drawer-btn tp-drawer-btn--ghost" onClick={onClose}>
                  Stay on Command Center
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
