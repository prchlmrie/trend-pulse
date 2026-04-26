import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Bell, Settings } from 'lucide-react';
import { PulseIndicator } from './PulseIndicator';
import { fetchNotifications } from '../api/client';
import './Layout.css';

export function Layout() {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchNotifications(3).then(data => setAlerts(data.items)).catch(console.error);
  }, []);

  return (
    <div className="layout-root">
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-mark">
            <PulseIndicator size="small" />
          </div>
          <span className="logo-text">TrendPulse</span>
        </div>
        
        <nav className="nav-menu">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            Command Center
          </Link>
          <Link to="/trends" className={`nav-link ${location.pathname === '/trends' ? 'active' : ''}`}>
            <TrendingUp size={20} />
            Trend Explorer
          </Link>
          <Link to="/opportunities" className={`nav-link ${location.pathname === '/opportunities' ? 'active' : ''}`}>
            <Settings size={20} />
            Opportunity Finder
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-link">
            <Settings size={20} />
            Settings
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div className="search-bar">
            {/* Search input could go here */}
          </div>
          <div className="topbar-actions">
            <button className="icon-btn">
              <Bell size={20} />
              {alerts.length > 0 && <span className="badge-dot"></span>}
            </button>
            <div className="user-avatar">AD</div>
          </div>
        </header>
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
