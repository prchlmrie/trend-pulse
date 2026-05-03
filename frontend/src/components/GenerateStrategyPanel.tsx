import { useQuery } from '@tanstack/react-query';
import { X, Target } from 'lucide-react';
import { fetchUserRecommendations } from '../api/client';
import { formatPHP } from '../utils/formatters';
import { Badge } from './Badge';
import './GenerateStrategyPanel.css';

type StrategyItem = {
  trend_name: string;
  suggested_action: string;
  allocated_budget: number;
  expected_return: number;
  confidence: number;
};

type RecommendationsPayload = {
  user: { budget: number };
  items: StrategyItem[];
};

export function GenerateStrategyPanel({ onClose }: { onClose: () => void }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['userRecommendations', 1],
    queryFn: () => fetchUserRecommendations(1),
  });

  const payload = data as RecommendationsPayload | undefined;
  const loading = isPending;
  const empty = !payload?.items?.length;

  return (
    <>
      <div className="panel-overlay" onClick={onClose} role="presentation" />
      <div className="strategy-panel">
        <div className="panel-header">
          <div className="panel-title-area">
            <Target size={24} className="panel-icon" />
            <h2>AI Strategy Generation</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="panel-content">
          {loading ? (
            <div className="loading-state">Generating Strategy...</div>
          ) : isError || empty ? (
            <div className="error-state">No strategy found. Ensure DB is seeded.</div>
          ) : (
            <>
              <div className="strategy-summary">
                <div className="summary-item">
                  <span className="summary-label">Target Budget</span>
                  <span className="summary-value">{formatPHP(payload.user.budget, false)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Expected Return</span>
                  <span className="summary-value text-growth">
                    {formatPHP(payload.items.reduce((acc, item) => acc + item.expected_return, 0), false)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Confidence</span>
                  <span className="summary-value">
                    {Math.round((payload.items.reduce((acc, item) => acc + item.confidence, 0) / payload.items.length) * 100)}%
                  </span>
                </div>
              </div>

              <div className="portfolio-list">
                <h3>Recommended Portfolio</h3>
                {payload.items.map((item, idx) => (
                  <div key={idx} className="portfolio-item portfolio-item--editorial">
                    <div className="item-header">
                      <h4>{item.trend_name}</h4>
                      <Badge type={item.suggested_action}>{item.suggested_action}</Badge>
                    </div>
                    <div className="item-details">
                      <div className="item-detail">
                        <span>Allocated</span>
                        <strong>{formatPHP(item.allocated_budget, false)}</strong>
                      </div>
                      <div className="item-detail">
                        <span>Expected Return</span>
                        <strong className="text-growth">{formatPHP(item.expected_return, false)}</strong>
                      </div>
                      <div className="item-detail">
                        <span>Confidence</span>
                        <strong>{Math.round(item.confidence * 100)}%</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
