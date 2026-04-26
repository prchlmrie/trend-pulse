import React, { useState } from 'react';
import { fetchOpportunities } from '../api/client';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { Search, DollarSign, ArrowUpRight } from 'lucide-react';
import { formatPHP, getRandomProductImage } from '../utils/formatters';
import './OpportunityFinder.css';

export function OpportunityFinder() {
  const [budget, setBudget] = useState('3000');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpportunities(budget, 3);
      setResults(data);
    } catch (err) {
      setError('Failed to analyze opportunities.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="opportunity-finder">
      <div className="header-section">
        <div>
          <h1 className="page-title">Opportunity Finder</h1>
          <p className="page-subtitle">Find the best products to source based on your budget.</p>
        </div>
      </div>

      <Card variant="low" className="budget-input-card glass-panel">
        <h2 className="card-heading">Set Your Sourcing Budget</h2>
        <div className="input-row">
          <div className="budget-input-wrapper">
            <DollarSign size={20} className="input-icon" />
            <input 
              type="number" 
              className="budget-input" 
              value={budget} 
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <Button variant="primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analyzing...' : 'Find Opportunities'}
            <Search size={16} />
          </Button>
        </div>
      </Card>

      {error && <div className="error-message">{error}</div>}

      {results && (
        <div className="results-section">
          <div className="results-summary">
            <h3>Analysis Complete</h3>
            <p>Based on your budget of <strong>{formatPHP(results.budget, false)}</strong>, we recommend the following portfolio.</p>
            <p>Estimated Remaining Budget: <strong>{formatPHP(results.remaining_budget, false)}</strong></p>
          </div>

          <div className="recommended-grid">
            {results.recommended_products.map((item, idx) => (
              <Card key={idx} variant="lowest" className="product-card ghost-border">
                <div className="product-image-container">
                  <img src={getRandomProductImage(item.trend_name)} alt={item.trend_name} className="product-image" />
                  <Badge type={item.action} className="product-badge">{item.action}</Badge>
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
                  <Button variant="outline" className="full-width-btn">
                    View Details <ArrowUpRight size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
