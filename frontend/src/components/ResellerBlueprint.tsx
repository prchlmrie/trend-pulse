import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { fetchResellerBlueprint } from '../api/client';
import { formatPHP } from '../utils/formatters';
import './ResellerBlueprint.css';

type Blueprint = {
  ok: boolean;
  keyword: string;
  mock_ai?: boolean;
  errors?: string[];
  demand?: {
    relative_interest_tail: number;
    trends_period: string;
    geo?: string | null;
  };
  marketplace?: {
    samples: { title: string; snippet: string; link?: string | null; source_label?: string }[];
    prices_php: { min: number | null; max: number | null; avg: number | null; parsed_quote_count: number };
    listing_hits: number;
    sources_tried: string[];
  };
  reseller_math?: {
    currency: string;
    est_retail_avg_php: number | null;
    est_buy_floor_php: number | null;
    est_profit_per_unit_php: number | null;
    roi_percent: number | null;
    listing_hits: number;
    methodology: string;
  };
  consultant_note?: string;
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return formatPHP(n, false);
}

export function ResellerBlueprint() {
  const [keyword, setKeyword] = useState('white sneakers');
  const [includeLazada, setIncludeLazada] = useState(true);
  const [data, setData] = useState<Blueprint | null>(null);

  const mutation = useMutation({
    mutationFn: () => fetchResellerBlueprint({ keyword: keyword.trim(), include_lazada: includeLazada }),
    onSuccess: (res) => setData(res as Blueprint),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    mutation.mutate();
  };

  const math = data?.reseller_math;
  const demand = data?.demand;
  const market = data?.marketplace;

  return (
    <div className="rb-page">
      <div className="rb-hero">
        <p className="rb-kicker">Live data · SerpApi · NVIDIA</p>
        <h1 className="rb-title">Reseller blueprint</h1>
        <p className="rb-lead">
          Pull Google Trends demand plus Shopee/Lazada price hints (via Google <code>site:</code> search), then get a
          consultant-style readout. Numbers are estimates — always confirm on-marketplace before you buy.
        </p>
      </div>

      <form className="rb-form" onSubmit={onSubmit}>
        <label className="rb-label" htmlFor="rb-keyword">
          Product or niche keyword
        </label>
        <div className="rb-form-row">
          <input
            id="rb-keyword"
            className="rb-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. oversized hoodie"
            autoComplete="off"
          />
          <button type="submit" className="rb-submit" disabled={mutation.isPending || !keyword.trim()}>
            {mutation.isPending ? (
              <>
                <Loader2 className="rb-spin" size={18} />
                Building…
              </>
            ) : (
              'Generate blueprint'
            )}
          </button>
        </div>
        <label className="rb-check">
          <input type="checkbox" checked={includeLazada} onChange={(e) => setIncludeLazada(e.target.checked)} />
          Include Lazada (extra SerpApi call)
        </label>
      </form>

      {mutation.isError ? (
        <div className="rb-banner rb-banner--err" role="alert">
          {(mutation.error as Error)?.message || 'Request failed'}
        </div>
      ) : null}

      {data ? (
        <div className="rb-grid">
          <section className="rb-card">
            <h2 className="rb-card-title">Demand snapshot</h2>
            <p className="rb-metric">
              <span className="rb-metric-label">Google Trends (tail)</span>
              <span className="rb-metric-value">{demand?.relative_interest_tail ?? 0}</span>
            </p>
            <p className="rb-muted">
              Period: {demand?.trends_period || '—'}
              {demand?.geo ? ` · Geo: ${demand.geo}` : null}
            </p>
          </section>

          <section className="rb-card">
            <h2 className="rb-card-title">Marketplace signals</h2>
            <p className="rb-metric">
              <span className="rb-metric-label">Listing hits</span>
              <span className="rb-metric-value">{market?.listing_hits ?? 0}</span>
            </p>
            <p className="rb-metric">
              <span className="rb-metric-label">₱ quotes parsed</span>
              <span className="rb-metric-value">{market?.prices_php?.parsed_quote_count ?? 0}</span>
            </p>
            <p className="rb-price-row">
              <span>Min {fmtMoney(market?.prices_php?.min ?? null)}</span>
              <span>Avg {fmtMoney(market?.prices_php?.avg ?? null)}</span>
              <span>Max {fmtMoney(market?.prices_php?.max ?? null)}</span>
            </p>
            <p className="rb-muted">{market?.sources_tried?.join(' · ')}</p>
          </section>

          <section className="rb-card rb-card--wide">
            <h2 className="rb-card-title">Reseller math (illustrative)</h2>
            <div className="rb-math-grid">
              <div>
                <p className="rb-metric-label">Est. retail (avg)</p>
                <p className="rb-money">{fmtMoney(math?.est_retail_avg_php ?? null)}</p>
              </div>
              <div>
                <p className="rb-metric-label">Est. buy floor (0.55×)</p>
                <p className="rb-money">{fmtMoney(math?.est_buy_floor_php ?? null)}</p>
              </div>
              <div>
                <p className="rb-metric-label">Est. profit / unit</p>
                <p className="rb-money">{fmtMoney(math?.est_profit_per_unit_php ?? null)}</p>
              </div>
              <div>
                <p className="rb-metric-label">ROI vs buy floor</p>
                <p className="rb-money">{math?.roi_percent != null ? `${math.roi_percent.toFixed(1)}%` : '—'}</p>
              </div>
            </div>
            {math?.methodology ? <p className="rb-methodology">{math.methodology}</p> : null}
          </section>

          <section className="rb-card rb-card--wide rb-card--ai">
            <div className="rb-card-head">
              <h2 className="rb-card-title">AI consultant</h2>
              {data.mock_ai ? <span className="rb-pill">Mock / offline</span> : <span className="rb-pill rb-pill--live">NVIDIA</span>}
            </div>
            <pre className="rb-note">{data.consultant_note || '—'}</pre>
          </section>

          {market?.samples?.length ? (
            <section className="rb-card rb-card--wide">
              <h2 className="rb-card-title">Sample results</h2>
              <ul className="rb-samples">
                {market.samples.map((s, i) => (
                  <li key={i} className="rb-sample">
                    <div className="rb-sample-meta">{s.source_label}</div>
                    <div className="rb-sample-title">{s.title}</div>
                    <div className="rb-sample-snippet">{s.snippet}</div>
                    {s.link ? (
                      <a className="rb-sample-link" href={s.link} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.errors?.length ? (
            <div className="rb-banner rb-banner--warn" role="status">
              {data.errors.join(' · ')}
            </div>
          ) : null}

          {!data.ok ? <p className="rb-muted">Some inputs failed — see warnings above.</p> : null}

          <p className="rb-footer-hint">
            Want Q&A on saved trends? <Link to="/ai-analyst">Open AI Analyst</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
