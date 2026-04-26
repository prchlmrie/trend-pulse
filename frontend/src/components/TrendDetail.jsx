import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTrendDetails } from '../api/client';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { formatPHP, getRandomProductImage } from '../utils/formatters';
import './TrendDetail.css';

export function TrendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Check local storage for saved state
    const savedTrends = JSON.parse(localStorage.getItem('savedTrends') || '[]');
    setSaved(savedTrends.includes(id));

    fetchTrendDetails(id)
      .then(data => {
        setTrend(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [id]);

  const toggleSave = () => {
    const savedTrends = JSON.parse(localStorage.getItem('savedTrends') || '[]');
    if (saved) {
      localStorage.setItem('savedTrends', JSON.stringify(savedTrends.filter(tId => tId !== id)));
      setSaved(false);
    } else {
      savedTrends.push(id);
      localStorage.setItem('savedTrends', JSON.stringify(savedTrends));
      setSaved(true);
    }
  };

  if (loading) return <div className="loading-state">Loading Analytics...</div>;
  if (!trend) return <div className="error-state">Trend not found.</div>;

  // Mock duration calculation
  const getDurationScore = (stage) => {
    const map = { 'EMERGING': 30, 'GROWING': 65, 'PEAKING': 95, 'DECLINING': 15 };
    return map[stage] || 50;
  };

  const getMentionsScore = (engagement) => Math.min(100, Math.max(10, (engagement / 50000) * 100));
  
  const chartData = [
    { label: 'Peak Mentions', value: getMentionsScore(trend.total_engagement), display: trend.total_engagement.toLocaleString() },
    { label: 'Growth Rate', value: Math.min(100, Math.max(0, trend.predicted_growth_14d * 2)), display: `+${trend.predicted_growth_14d}%` },
    { label: 'Confidence %', value: trend.trend_score * 100, display: `${Math.round(trend.trend_score * 100)}%` },
    { label: 'Duration (Risk)', value: getDurationScore(trend.lifecycle_stage), display: trend.lifecycle_stage }
  ];

  return (
    <div className="trend-detail-page">
      <div className="header-section">
        <div className="header-left">
          <Button variant="outline" className="back-btn" onClick={() => navigate('/trends')}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div>
            <h1 className="page-title">{trend.name}</h1>
            <p className="page-subtitle">{trend.category} | {trend.product_category}</p>
          </div>
        </div>
        <div className="header-actions">
          <Button variant={saved ? "primary" : "outline"} onClick={toggleSave}>
            <Bookmark size={16} /> {saved ? 'Saved to Profile' : 'Save Trend'}
          </Button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="left-column">
          <Card variant="lowest" padding="none" className="image-card glass-panel ghost-border">
            <img src={getRandomProductImage(trend.name)} alt={trend.name} className="detail-image" />
          </Card>
          
          <Card variant="low" className="reasoning-card glass-panel ghost-border">
            <h3>AI Reasoning</h3>
            <p>{trend.reasoning}</p>
          </Card>
        </div>

        <div className="right-column">
          <Card variant="lowest" className="metrics-card glass-panel ghost-border">
            <div className="metrics-header">
              <h3>Action & Risk</h3>
              <Badge type={trend.suggested_action}>{trend.suggested_action}</Badge>
            </div>
            
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="box-label">Profit Potential</span>
                <span className="box-value text-growth">{formatPHP(trend.profit_score, true)}</span>
              </div>
              <div className="metric-box">
                <span className="box-label">Competition</span>
                <span className="box-value">{trend.competition_score.toFixed(2)}</span>
              </div>
              <div className="metric-box">
                <span className="box-label">Risk Level</span>
                <span className="box-value">{trend.risk_level}</span>
              </div>
              <div className="metric-box">
                <span className="box-label">Lifecycle Stage</span>
                <span className="box-value">{trend.lifecycle_stage}</span>
              </div>
            </div>
          </Card>

          <Card variant="lowest" className="chart-card glass-panel ghost-border">
            <h3>Analytics Overview</h3>
            <div className="bar-chart">
              {chartData.map((data, idx) => (
                <div key={idx} className="chart-row">
                  <div className="chart-label">{data.label}</div>
                  <div className="chart-bar-container">
                    <div 
                      className="chart-bar-fill" 
                      style={{ width: `${Math.max(5, data.value)}%` }}
                    ></div>
                  </div>
                  <div className="chart-value">{data.display}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
