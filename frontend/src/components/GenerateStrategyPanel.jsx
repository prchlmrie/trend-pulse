import React, { useEffect, useState } from 'react';
import { fetchUserRecommendations } from '../api/client';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { X, Target } from 'lucide-react';
import { formatPHP } from '../utils/formatters';
import './GenerateStrategyPanel.css';

export function GenerateStrategyPanel({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRecommendations()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="strategy-panel glass-panel">
        <div className="panel-header">
          <div className="panel-title-area">
            <Target size={24} className="panel-icon" />
            <h2>AI Strategy Generation</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="panel-content">
          {loading ? (
            <div className="loading-state">Generating Strategy...</div>
          ) : !data || !data.items || data.items.length === 0 ? (
            <div className="error-state">No strategy found. Ensure DB is seeded.</div>
          ) : (
            <>
              <div className="strategy-summary">
                <div className="summary-item">
                  <span className="summary-label">Target Budget</span>
                  <span className="summary-value">{formatPHP(data.user.budget, false)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Expected Return</span>
                  <span className="summary-value text-growth">
                    {formatPHP(data.items.reduce((acc, item) => acc + item.expected_return, 0), false)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Confidence</span>
                  <span className="summary-value">
                    {Math.round((data.items.reduce((acc, item) => acc + item.confidence, 0) / data.items.length) * 100)}%
                  </span>
                </div>
              </div>

              <div className="portfolio-list">
                <h3>Recommended Portfolio</h3>
                {data.items.map((item, idx) => (
                  <Card key={idx} variant="low" className="portfolio-item ghost-border">
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
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
