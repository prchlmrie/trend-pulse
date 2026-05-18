import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMe, fetchOpportunities, getAccessToken, runPipeline, saveFinderStrategy } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import { confidenceMatch } from '../utils/merchantFriendly';
import { unitEconomics } from '../utils/resellerLedger';
import { GlossaryTerm } from './GlossaryTerm';
import { Button } from './Button';
import './OpportunityFinder.css';

type Goal = 'fast_cash' | 'long_term';

type OpportunityItem = {
  trend_id?: number | null;
  trend_name: string;
  image_url?: string | null;
  action: string;
  allocation: number;
  units: number;
  risk: string;
  profit_score?: number;
};

type OpportunitiesResult = {
  budget: number;
  remaining_budget: number;
  recommended_products: OpportunityItem[];
};

function actionLabel(action: string): string {
  const a = (action || '').toUpperCase();
  if (a === 'SELL') return 'Ready to scale';
  if (a === 'TEST') return 'Good for a test batch';
  return action;
}

export function OpportunityFinder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState(15000);
  const [goal, setGoal] = useState<Goal>('fast_cash');
  const [finderError, setFinderError] = useState<string | null>(null);
  const seededBudget = useRef(false);

  const token = getAccessToken();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
  });

  useEffect(() => {
    const b = meQuery.data?.budget;
    if (b == null || seededBudget.current) return;
    setBudget(Math.max(1000, Math.round(Number(b))));
    seededBudget.current = true;
  }, [meQuery.data?.budget]);

  const saveMutation = useMutation({
    mutationFn: async (payload: OpportunitiesResult) => {
      const picks = payload.recommended_products
        .filter((p) => p.trend_id != null)
        .map((p) => ({
          trend_id: Number(p.trend_id),
          allocation: p.allocation,
          profit_score: Number(p.profit_score ?? 0),
        }));
      if (!picks.length) throw new Error('No trend IDs to save.');
      return saveFinderStrategy(picks);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userRecommendations'] }),
  });

  const pipelineMutation = useMutation({
    mutationFn: runPipeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });

  const mutation = useMutation({
    mutationFn: () => fetchOpportunities(budget, goal === 'fast_cash' ? 3 : 5),
    onSuccess: (data) => {
      saveMutation.reset();
      setFinderError(null);
      const products = (data as OpportunitiesResult).recommended_products ?? [];
      if (!products.length) {
        setFinderError(
          'No products fit this budget yet. Try a higher amount, run Find New Trends in the sidebar, or pick long-term growth for more options.',
        );
        return;
      }
      setStep(3);
    },
    onError: (e: Error) => {
      setFinderError(e.message || 'Could not build your cart. Is the API running?');
    },
  });

  const results = mutation.data as OpportunitiesResult | undefined;
  const allocated = useMemo(() => {
    return (results?.recommended_products ?? []).reduce((s, p) => s + (Number(p.allocation) || 0), 0);
  }, [results]);
  const confidence = results ? confidenceMatch(allocated, results.budget) : 0;

  const estimatedUpside = useMemo(() => {
    if (!results?.recommended_products?.length) return 0;
    return results.recommended_products.reduce((sum, item) => {
      const ps = Number(item.profit_score ?? 0);
      const ue = unitEconomics(0, 0, ps);
      return sum + (Number(item.units) || 0) * ue.profitPerUnit;
    }, 0);
  }, [results]);

  const printCart = () => window.print();

  const resetWizard = () => {
    setStep(1);
    setFinderError(null);
    mutation.reset();
    saveMutation.reset();
  };

  return (
    <div className="opportunity-finder of-wizard">
      <div className="header-section">
        <h1 className="page-title">Find profits</h1>
        <p className="page-subtitle">
          Tell us your budget and goal — we&apos;ll build a simple shopping list from live catalog picks.
        </p>
      </div>

      <div className="of-steps" aria-label="Progress">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`of-step ${step >= n ? 'of-step--on' : ''}`}
            onClick={() => {
              if (n < step) setStep(n);
            }}
            disabled={n > step}
          >
            {n === 1 ? 'Budget' : n === 2 ? 'Goal' : 'Your cart'}
          </button>
        ))}
      </div>

      {step === 1 && (
        <section className="of-panel">
          <h2 className="of-panel-title">How much do you want to invest?</h2>
          <p className="of-panel-lead font-tabular">{formatPHP(budget, false)}</p>
          <input
            type="range"
            className="of-slider"
            min={1000}
            max={100000}
            step={500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
          <label className="of-budget-manual">
            Or type an amount
            <div className="of-budget-row">
              <span>₱</span>
              <input
                type="number"
                min={1000}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Math.max(1000, Number(e.target.value) || 1000))}
              />
            </div>
          </label>
          <div className="of-panel-actions">
            <Button variant="primary" type="button" onClick={() => setStep(2)}>
              Next
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="of-panel">
          <h2 className="of-panel-title">What&apos;s your goal?</h2>
          <p className="of-panel-hint">
            Budget: <strong className="font-tabular">{formatPHP(budget, false)}</strong>
          </p>
          <div className="of-goals">
            <button
              type="button"
              className={`of-goal ${goal === 'fast_cash' ? 'of-goal--on' : ''}`}
              onClick={() => setGoal('fast_cash')}
            >
              <strong>Fast cash</strong>
              <span>3 focused picks — quicker turnover</span>
            </button>
            <button
              type="button"
              className={`of-goal ${goal === 'long_term' ? 'of-goal--on' : ''}`}
              onClick={() => setGoal('long_term')}
            >
              <strong>Long-term growth</strong>
              <span>5 picks — more spread, steadier build</span>
            </button>
          </div>
          {finderError && <p className="of-error">{finderError}</p>}
          <div className="of-panel-actions">
            <Button variant="outline" type="button" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Building your cart…' : 'Build my cart'}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && results && results.recommended_products.length > 0 && (
        <section className="of-panel of-cart" id="of-print-area">
          <div className="of-confidence">
            <span className="of-confidence-score font-tabular">{confidence}%</span>
            <span>match for your budget</span>
          </div>
          <h2 className="of-panel-title">Your shopping cart</h2>
          <p className="of-cart-summary font-tabular">
            Spending about <strong>{formatPHP(allocated, false)}</strong> of{' '}
            <strong>{formatPHP(results.budget, false)}</strong>
            {estimatedUpside > 0 ? (
              <>
                {' '}
                — modeled profit upside about <strong>{formatPHP(Math.round(estimatedUpside), false)}</strong>
              </>
            ) : null}
            . Leftover: <strong>{formatPHP(results.remaining_budget, false)}</strong>.
          </p>
          <ul className="of-cart-list">
            {results.recommended_products.map((item) => (
              <li key={`${item.trend_id}-${item.trend_name}`} className="of-cart-item">
                <img src={trendHeroImage({ image_url: item.image_url, name: item.trend_name })} alt="" />
                <div className="of-cart-item-body">
                  <strong>{item.trend_name}</strong>
                  <p className="font-tabular">
                    Buy <strong>{item.units}</strong> units · spend <strong>{formatPHP(item.allocation, false)}</strong>
                  </p>
                  <p className="of-cart-meta">
                    {actionLabel(item.action)} · {item.risk} risk
                  </p>
                  {item.trend_id != null && (
                    <button type="button" className="of-cart-link" onClick={() => navigate(`/trends/${item.trend_id}`)}>
                      View product details
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="of-cart-note">
            Built for <GlossaryTerm term="Capital" /> of {formatPHP(results.budget, false)} —{' '}
            {goal === 'fast_cash' ? 'fewer items, faster flips' : 'more items for a balanced mix'}.
          </p>
          <div className="of-panel-actions">
            <Button variant="outline" type="button" onClick={() => setStep(2)}>
              Change goal
            </Button>
            <Button variant="outline" type="button" onClick={printCart}>
              Print list
            </Button>
            {token ? (
              <Button
                variant="primary"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(results)}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save to portfolio'}
              </Button>
            ) : (
              <Link to="/" className="of-signin-link">
                Sign in to save this cart
              </Link>
            )}
          </div>
          {saveMutation.isSuccess && <p className="save-strategy-ok">Saved to your portfolio.</p>}
          {saveMutation.isError && (
            <p className="of-error">{saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed'}</p>
          )}
          <button type="button" className="of-link" onClick={resetWizard}>
            Start over
          </button>
        </section>
      )}

      {step === 3 && (!results || !results.recommended_products.length) && (
        <section className="of-panel of-empty">
          <h2 className="of-panel-title">Nothing in your cart yet</h2>
          <p className="of-panel-hint">
            We couldn&apos;t match products to your budget. Refresh catalog data, then try again with a higher budget.
          </p>
          <div className="of-panel-actions">
            <Button
              variant="outline"
              type="button"
              disabled={pipelineMutation.isPending}
              onClick={() => pipelineMutation.mutate()}
            >
              {pipelineMutation.isPending ? 'Refreshing…' : 'Refresh catalog'}
            </Button>
            <Button variant="primary" type="button" onClick={() => setStep(1)}>
              Change budget
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
