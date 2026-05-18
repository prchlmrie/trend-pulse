import { useMutation, useQuery } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { askAnalyst, fetchTrendDetails, fetchTrends } from '../api/client';
import { formatPHP } from '../utils/formatters';
import { unitEconomics } from '../utils/resellerLedger';
import { buildWhyBullets, verdictFromTrend, whatIfFromCapital, type Verdict } from './aiAnalystDecision';
import './AiAnalyst.css';

type AnalystResult = {
  mock?: boolean;
  intent?: string;
  trend?: string | null;
  sources?: string[];
  answer?: string;
};

function suggestNeedle(raw: string): string {
  const line = raw.split('\n').pop()?.trim() ?? '';
  return line.slice(Math.max(0, line.length - 52)).trim();
}

type SuggestRow = { id: number; name: string };

const CONSULTANT_SHORTCUTS: { label: string; build: (trendPhrase: string) => string }[] = [
  {
    label: 'Should I buy this?',
    build: (t) => `Is "${t}" a good idea to sell? Tell me the profit, risks, and if it's right for me.`,
  },
  {
    label: 'How many should I order?',
    build: (t) => `Stocking advice for "${t}": how many should I buy to start, and when should I reorder?`,
  },
  {
    label: 'Is it too late?',
    build: (t) => `Is the trend for "${t}" dying out? Look at the latest signals and tell me if it's still safe.`,
  },
  {
    label: 'Who else is selling this?',
    build: (t) => `How many other people are selling "${t}"? Will I have to lower my prices to compete?`,
  },
];

function verdictLabel(v: Verdict): string {
  if (v === 'buy') return 'Buy';
  if (v === 'skip') return 'Skip';
  return 'Wait';
}

function WhatIfStrip({
  capital,
  onCapital,
  wholesale,
  profitPerUnit,
}: {
  capital: number;
  onCapital: (n: number) => void;
  wholesale: number;
  profitPerUnit: number;
}) {
  const { units, netProfit } = whatIfFromCapital(capital, { wholesale, retail: wholesale + profitPerUnit, profitPerUnit });
  return (
    <div className="ai-whatif">
      <p className="ai-whatif-label font-headline">I have this much to spend — how much will I make?</p>
      <div className="ai-whatif-row">
        <input
          type="range"
          className="ai-whatif-range"
          min={500}
          max={50_000}
          step={250}
          value={capital}
          onChange={(e) => onCapital(Number(e.target.value))}
          aria-valuetext={`${capital} pesos`}
        />
        <span className="ai-whatif-value font-tabular">{formatPHP(capital, false)}</span>
      </div>
      <p className="ai-whatif-summary font-tabular">
        With <strong>{formatPHP(capital, false)}</strong>, you can buy about <strong>{units}</strong> units and make roughly{' '}
        <strong className="ai-whatif-profit">{formatPHP(netProfit, false)}</strong> in profit.
      </p>
    </div>
  );
}

function AiAnalystForm({ initialTrendFromUrl }: { initialTrendFromUrl: string | null }) {
  const [question, setQuestion] = useState(() =>
    initialTrendFromUrl ? `Tell me about ${initialTrendFromUrl}.` : ''
  );
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<AnalystResult | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(true);
  const [whatIfCapital, setWhatIfCapital] = useState(5000);
  const wrapRef = useRef<HTMLDivElement>(null);

  const deferredQuestion = useDeferredValue(question);
  const needle = suggestNeedle(deferredQuestion);

  const suggestQuery = useQuery({
    queryKey: ['trends', 'suggest', needle],
    queryFn: () => fetchTrends({ search: needle, limit: 8 }),
    enabled: needle.length >= 2,
    staleTime: 15_000,
  });
  const suggestions: SuggestRow[] = (suggestQuery.data?.items ?? [])
    .filter((r: { name?: string }) => r.name)
    .map((r: { id: number; name: string }) => ({ id: r.id, name: r.name }));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const q = question.trim();
      if (!q) throw new Error('Enter a question.');
      return askAnalyst(q, userId.trim() === '' ? null : userId);
    },
    onSuccess: (data) => setResult(data as AnalystResult),
    onError: () => setResult(null),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    mutation.mutate();
  };

  const loading = mutation.isPending;
  const error =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
        ? 'Request failed'
        : null;

  const trendEnrichQuery = useQuery({
    queryKey: ['analyst-matched-trend', result?.trend],
    enabled: Boolean(result?.trend?.trim()),
    queryFn: async () => {
      const name = String(result!.trend).trim();
      const list = await fetchTrends({ search: name, limit: 12 });
      const items: { id: number; name: string }[] = list.items ?? [];
      if (!items.length) return null;
      const lower = name.toLowerCase();
      const row =
        items.find((i) => i.name.toLowerCase() === lower) ||
        items.find((i) => i.name.toLowerCase().includes(lower)) ||
        items[0];
      return fetchTrendDetails(row.id);
    },
  });

  const detail = trendEnrichQuery.data as Record<string, unknown> | null | undefined;
  const ue =
    detail && typeof detail === 'object'
      ? unitEconomics(
          Number(detail.price_min ?? 0),
          Number(detail.price_max ?? 0),
          Number(detail.profit_score ?? 0),
        )
      : null;

  const verdict: Verdict | null =
    detail && ue ? verdictFromTrend(detail as Parameters<typeof verdictFromTrend>[0]) : null;
  const whyBullets =
    detail && ue ? buildWhyBullets(detail as Parameters<typeof buildWhyBullets>[0], ue) : null;
  const bottomLine =
    detail && ue
      ? (() => {
          const starter = Math.max(500, Math.round(ue.wholesale * 12));
          const { units, netProfit } = whatIfFromCapital(starter, ue);
          return `Starter read: about ${formatPHP(netProfit, false)} modeled profit on ~${formatPHP(starter, false)} buy-in (${units} units).`;
        })()
      : null;

  const applyShortcut = (template: (phrase: string) => string) => {
    const t = needle.length >= 2 ? needle : '';
    if (!t) {
      setQuestion((q) =>
        `${q.trim()}\n\nName the trend in the box (e.g. Eco Activewear), then tap the shortcut again.`.trim()
      );
      return;
    }
    setQuestion(template(t));
    setSuggestOpen(false);
  };

  const pickSuggestion = (name: string) => {
    setQuestion((prev) => `${prev.trimEnd()} ${name}`.trimStart());
    setSuggestOpen(false);
  };

  useEffect(() => {
    if (result) setWhatIfCapital(5000);
  }, [result]);

  return (
    <div className="ai-consultant-feed">
      <form className="ai-composer-card" onSubmit={onSubmit}>
        <p className="ai-consultant-kicker">Consultant shortcuts</p>
        <div className="ai-shortcuts" role="group" aria-label="Quick questions">
          {CONSULTANT_SHORTCUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="ai-shortcut-chip"
              disabled={loading}
              onClick={() => applyShortcut((phrase) => s.build(phrase))}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ai-composer-bubble" ref={wrapRef}>
          <textarea
            id="ai-question"
            className="ai-composer-input"
            rows={4}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder="Type a trend name, then use a shortcut — or ask anything in plain language."
            disabled={loading}
            aria-label="Your question"
          />
          {suggestOpen && needle.length >= 2 && suggestions.length > 0 && !loading && (
            <ul className="trend-suggest-dropdown" role="listbox">
              {suggestions.map((row) => (
                <li key={row.id}>
                  <button type="button" className="trend-suggest-item" onClick={() => pickSuggestion(row.name)}>
                    {row.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <details className="ai-advanced">
          <summary>Technical · optional profile ID</summary>
          <p className="ai-advanced-hint">Adds budget and name context when the API supports it.</p>
          <input
            type="number"
            min={1}
            className="ai-advanced-input font-tabular"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            disabled={loading}
            aria-label="Optional user ID"
          />
        </details>

        {error && <p className="ai-analyst-error">{error}</p>}

        <button type="submit" className="ai-primary-cta" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="spin" /> Getting advice…
            </>
          ) : (
            'Get advice'
          )}
        </button>
      </form>

      {loading && (
        <div className="ai-loading-card" aria-busy>
          <div className="ai-loading-bar" />
          <p className="ai-loading-copy font-headline">Pulling live catalog signals…</p>
        </div>
      )}

      {!result && !loading && (
        <section className="ai-empty-card">
          <p className="ai-empty-title font-headline">Your next decision shows here</p>
          <p className="ai-empty-body">
            Run a shortcut or ask in your own words. We&apos;ll surface a clear verdict, three plain-language reasons, and a
            modeled bottom line when we match a catalog trend.
          </p>
        </section>
      )}

      {result && (
        <section className="ai-decision-stack">
          <article className="ai-decision-card">
            {result.trend && trendEnrichQuery.isPending ? (
              <span className="ai-verdict ai-verdict--wait">Reading catalog…</span>
            ) : verdict ? (
              <span className={`ai-verdict ai-verdict--${verdict}`}>{verdictLabel(verdict)}</span>
            ) : (
              <span className="ai-verdict ai-verdict--wait">Wait</span>
            )}

            <h3 className="ai-decision-trend font-headline">{result.trend ? result.trend : 'General brief'}</h3>

            {whyBullets && (
              <ul className="ai-why-list">
                {whyBullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {!whyBullets && (
              <ul className="ai-why-list ai-why-list--muted">
                <li>We couldn&apos;t auto-match a catalog row — refine the trend name in your question and run again.</li>
                <li>Open Trend Explorer to compare velocity, margin, and risk side by side.</li>
                <li>Try a shortcut after typing the exact product phrase.</li>
              </ul>
            )}

            {bottomLine && <p className="ai-bottom-line font-tabular">{bottomLine}</p>}

            {detail && ue && (
              <WhatIfStrip capital={whatIfCapital} onCapital={setWhatIfCapital} wholesale={ue.wholesale} profitPerUnit={ue.profitPerUnit} />
            )}
          </article>

          <details className="ai-tech-details">
            <summary>Technical details</summary>
            <div className="ai-tech-inner">
              {result.mock && <span className="meta-pill mock">Mock mode</span>}
              {result.intent && (
                <p>
                  <span className="ai-tech-key">Intent</span> {result.intent}
                </p>
              )}
              {result.trend && (
                <p>
                  <span className="ai-tech-key">Matched name</span> {result.trend}
                </p>
              )}
              {result.sources && result.sources.length > 0 && (
                <div>
                  <span className="ai-tech-key">Sources</span>
                  <ul className="ai-tech-sources">
                    {result.sources.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>

          <p className="ai-result-footer">
            Browse live rows in{' '}
            <Link to="/trends" className="inline-link">
              Trend Explorer
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}

export function AiAnalyst() {
  const [searchParams] = useSearchParams();
  const trendFromUrl = searchParams.get('trend');
  return (
    <div className="ai-analyst-page">
      <header className="header-section">
        <div>
          <h1 className="page-title">AI Analyst</h1>
          <p className="page-subtitle">
            Consultant-style answers on profit, stocking, hype, and competition — grounded in your TrendPulse catalog.
          </p>
        </div>
      </header>
      <AiAnalystForm key={trendFromUrl ?? '__none__'} initialTrendFromUrl={trendFromUrl} />
    </div>
  );
}
