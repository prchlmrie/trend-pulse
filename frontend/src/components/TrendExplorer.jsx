import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrends } from '../api/client';
import { Card } from './Card';
import { Badge } from './Badge';
import { Activity, Search, Filter } from 'lucide-react';
import { getRandomProductImage } from '../utils/formatters';
import './TrendExplorer.css';

export function TrendExplorer() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTrends({ limit: 50 })
      .then(data => {
        setTrends(data.items);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredTrends = trends.filter(trend => {
    const matchesFilter = activeFilter === 'ALL' || trend.suggested_action === activeFilter;
    const matchesSearch = trend.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="trend-explorer">
      <div className="header-section">
        <div>
          <h1 className="page-title">Trend Explorer</h1>
          <p className="page-subtitle">Deep dive into market movements.</p>
        </div>
      </div>

      <Card variant="low" className="filter-bar glass-panel ghost-border">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search trends..." 
            className="search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          <button className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}><Filter size={16} /> All Actions</button>
          <button className={`filter-btn ${activeFilter === 'SELL' ? 'active' : ''}`} onClick={() => setActiveFilter('SELL')}>SELL</button>
          <button className={`filter-btn ${activeFilter === 'TEST' ? 'active' : ''}`} onClick={() => setActiveFilter('TEST')}>TEST</button>
          <button className={`filter-btn ${activeFilter === 'IGNORE' ? 'active' : ''}`} onClick={() => setActiveFilter('IGNORE')}>IGNORE</button>
        </div>
      </Card>

      <div className="trends-table-container">
        {loading ? (
          <div className="loading-state">Loading trends...</div>
        ) : (
          <table className="trends-table">
            <thead>
              <tr>
                <th>Trend Name</th>
                <th>Category</th>
                <th>Lifecycle</th>
                <th>Score</th>
                <th>Action</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrends.map(trend => (
                <tr key={trend.id} onClick={() => navigate(`/trends/${trend.id}`)} style={{cursor: 'pointer'}}>
                  <td>
                    <div className="trend-name-cell">
                      <img src={getRandomProductImage(trend.name)} alt={trend.name} className="trend-thumbnail" />
                      <div className="trend-name-text">
                        <span className="trend-name">{trend.name}</span>
                        <span className="trend-category">{trend.product_category}</span>
                      </div>
                    </div>
                  </td>
                  <td>{trend.category}</td>
                  <td>
                    <Badge type={trend.lifecycle_stage}>{trend.lifecycle_stage}</Badge>
                  </td>
                  <td>
                    <div className="score-cell">
                      <Activity size={16} />
                      {Math.round(trend.trend_score * 100)}
                    </div>
                  </td>
                  <td>
                    <Badge type={trend.suggested_action}>{trend.suggested_action}</Badge>
                  </td>
                  <td>
                    <span className={`risk-indicator risk-${trend.risk_level.toLowerCase()}`}>
                      {trend.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
