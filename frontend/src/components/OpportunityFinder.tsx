import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { fetchMe, fetchOpportunities, getAccessToken, saveFinderStrategy } from '../api/client';
import { formatPHP, trendHeroImage } from '../utils/formatters';
import { Badge } from './Badge';
import { Button } from './Button';
import './OpportunityFinder.css';

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

export function OpportunityFinder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [budget, setBudget] = useState('15000');
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
    setBudget(String(Math.max(1, Math.round(Number(b)))));
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRecommendations'] });
    },
  });

  const mutation = useMutation({
    mutationFn: () => fetchOpportunities(Number(budget) || 15000, 3),
    onSuccess: () => {
      saveMutation.reset();
    },
  });

  const results = mutation.data as OpportunitiesResult | undefined;
  const error = mutation.isError ? 'Failed to analyze opportunities.' : null;
  const saveError =
    saveMutation.isError && saveMutation.error instanceof Error ? saveMutation.error.message : null;

  return (
    <div className="opportunity-finder">
      <div className="header-section">
        <div>
          <h1 className="page-title">Opportunity Finder</h1>
          <p className="page-subtitle">Find the best products to source based on your budget.</p>
          {token && meQuery.data?.budget != null && (
            <p className="page-subtitle budget-hint">Signed in — default budget from your profile.</p>
          )}
        </div>
      </div>

      <section className="editorial-section budget-input-card">
        <h2 className="editorial-section-title">Set your sourcing budget</h2>
        <div className="input-row">
          <div className="budget-input-wrapper">
            <span className="input-icon input-icon--peso" aria-hidden>
              ₱
            </span>
            <input
              type="number"
              className="budget-input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Analyzing...' : 'Find Opportunities'}
            <Search size={16} />
          </Button>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}

      {results && (
        <div className="results-section">
          <div className="results-summary">
            <h3>Analysis Complete</h3>
            <p>
              Based on your budget of <strong>{formatPHP(results.budget, false)}</strong>, we recommend the following portfolio.
            </p>
            <p>
              Estimated Remaining Budget: <strong>{formatPHP(results.remaining_budget, false)}</strong>
            </p>
            {token ? (
              <div className="save-strategy-row">
                <Button
                  variant="outline"
                  disabled={saveMutation.isPending || !results.recommended_products.some((p) => p.trend_id != null)}
                  onClick={() => saveMutation.mutate(results)}
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save this strategy to my portfolio'}
                </Button>
                {saveMutation.isSuccess && (
                  <span className="save-strategy-ok">Saved {saveMutation.data.saved} row(s).</span>
                )}
                {saveError && <span className="error-message inline-err">{saveError}</span>}
              </div>
            ) : (
              <p className="page-subtitle">Sign in to save this mix to your portfolio.</p>
            )}
          </div>

          <div className="recommended-editorial">
            {results.recommended_products.map((item, idx) => (
              <article key={idx} className="product-editorial-row">
                <div className="product-image-container">
                  <img src={trendHeroImage({ image_url: item.image_url, name: item.trend_name })} alt={item.trend_name} className="product-image" />
                  <Badge type={item.action} className="product-badge">
                    {item.action}
                  </Badge>
                </div>
                <div className="product-info">
                  <h3 className="product-title">{item.trend_name}</h3>
                  <div className="product-cost-row">
                    <span>Est. Cost:</span>
                    <strong>{formatPHP(item.allocation, false)}</strong>
                  </div>
                  <div className="product-quantity">
                    Quantity to source: <strong>{item.units} units</strong>
                  </div>
                  <div className="product-timing">
                    Risk Level: <Badge type="default">{item.risk}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="full-width-btn"
                    type="button"
                    onClick={() => item.trend_id != null && navigate(`/trends/${item.trend_id}`)}
                    disabled={item.trend_id == null}
                  >
                    View Details <ArrowUpRight size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
