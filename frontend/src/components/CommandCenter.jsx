import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary, runPipeline } from '../api/client';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { ArrowUpRight, Activity, BellRing, AlertTriangle, Info, Zap } from 'lucide-react';
import { formatPHP, getRandomProductImage } from '../utils/formatters';
import { GenerateStrategyPanel } from './GenerateStrategyPanel';
import './CommandCenter.css';

const AlertIcon = ({ level }) => {
  if (level === 'HIGH_OPPORTUNITY') return <BellRing size={20} className="alert-icon high" />;
  if (level === 'RISK_WARNING') return <AlertTriangle size={20} className="alert-icon warning" />;
  return <Info size={20} className="alert-icon info" />;
};

export function CommandCenter() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchDashboardSummary()
      .then(data => {
        setSummary(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateTrend = async () => {
    setIsGenerating(true);
    try {
      await runPipeline();
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading && !summary) return <div className="loading-state">Loading AI Insights...</div>;
  if (!summary) return <div className="error-state">Failed to load dashboard.</div>;

  return (
    <div className="command-center">
      {showStrategy && <GenerateStrategyPanel onClose={() => setShowStrategy(false)} />}
      <div className="header-section">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">Predictive intelligence overview.</p>
        </div>
        <div className="header-actions">
          <Button variant="outline" onClick={handleGenerateTrend} disabled={isGenerating}>
            <Zap size={16} /> {isGenerating ? 'Generating...' : 'Generate Trend'}
          </Button>
          <Button variant="primary" onClick={() => setShowStrategy(true)}>
            Generate Strategy
          </Button>
          <Card variant="lowest" padding="normal" className="confidence-card glass-panel ghost-border">
            <div className="confidence-label">AI Confidence Score</div>
            <div className="confidence-value">{summary.confidence_score}%</div>
          </Card>
        </div>
      </div>

      <div className="lifecycle-grid">
        <Card variant="low" className="lifecycle-stat glass-panel ghost-border">
          <div className="stat-label">Emerging</div>
          <div className="stat-value">{summary.lifecycle_counts.emerging}</div>
        </Card>
        <Card variant="low" className="lifecycle-stat glass-panel ghost-border">
          <div className="stat-label">Growing</div>
          <div className="stat-value">{summary.lifecycle_counts.growing}</div>
        </Card>
        <Card variant="low" className="lifecycle-stat glass-panel ghost-border">
          <div className="stat-label">Peaking</div>
          <div className="stat-value">{summary.lifecycle_counts.peaking}</div>
        </Card>
        <Card variant="low" className="lifecycle-stat glass-panel ghost-border">
          <div className="stat-label">Declining</div>
          <div className="stat-value">{summary.lifecycle_counts.declining}</div>
        </Card>
      </div>

      <div className="main-dashboard-grid">
        <div className="opportunities-section">
          <h2 className="section-title">Top Opportunities</h2>
          <div className="opportunities-list">
            {summary.top_opportunities.map(opp => (
              <Card key={opp.trend_id} variant="lowest" className="opportunity-card ghost-border">
                <div className="opp-image-container">
                  <img src={getRandomProductImage(opp.trend_name)} alt={opp.trend_name} className="opp-image" />
                  <Badge type={opp.suggested_action} className="opp-action-badge">{opp.suggested_action}</Badge>
                </div>
                
                <div className="opp-content">
                  <div className="opp-header">
                    <div className="opp-title-area">
                      <h3 className="opp-title">{opp.trend_name}</h3>
                    </div>
                    <div className="opp-score">
                      <Activity size={16} />
                      <span>{Math.round(opp.trend_score * 100)}</span>
                    </div>
                  </div>
                  
                  <div className="opp-metrics">
                    <div className="metric">
                      <span className="metric-label">Profit Potential</span>
                      <span className="metric-value">{formatPHP(opp.profit_score, true)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Predicted Growth</span>
                      <span className="metric-value text-growth">+{opp.predicted_growth_14d}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Competition</span>
                      <span className="metric-value">{opp.competition_level}</span>
                    </div>
                  </div>

                  <div className="opp-actions">
                    <Button variant={opp.suggested_action === 'SELL' ? 'growth' : 'primary'} onClick={() => navigate(`/trends/${opp.trend_id}`)}>
                      Analyze Trend <ArrowUpRight size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="alerts-section">
          <h2 className="section-title">Live Alerts</h2>
          <div className="alerts-list">
            {summary.live_alerts.map(alert => (
              <Card key={alert.id} variant="lowest" className={`alert-card type-${alert.alert_level.toLowerCase()}`}>
                <div className="alert-icon-wrapper">
                  <AlertIcon level={alert.alert_level} />
                </div>
                <div className="alert-content">
                  <span className="alert-badge">{alert.alert_level.replace('_', ' ')}</span>
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-time">{new Date(alert.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
