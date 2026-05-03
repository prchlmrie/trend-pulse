import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { fetchNotifications, getAccessToken, runPipeline, setAccessToken } from '../api/client';
import './Layout.css';

function pathActive(pathname: string, to: string): boolean {
  if (to === '/dashboard') return pathname === '/dashboard';
  if (to === '/trends') return pathname.startsWith('/trends');
  if (to === '/reseller-blueprint') return pathname === '/reseller-blueprint';
  return pathname === to;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getAccessToken();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 3],
    queryFn: () => fetchNotifications(3),
  });
  const alerts = notifData?.items ?? [];

  const pipelineMutation = useMutation({
    mutationFn: runPipeline,
    onSuccess: (data) => {
      setToast(data.message || 'Pipeline completed.');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['trends'] });
    },
    onError: (e: Error) => setToast(e.message || 'Pipeline failed.'),
  });

  const logout = () => {
    setAccessToken(null);
    navigate('/');
  };

  return (
    <div className="layout-root">
      {toast && (
        <div className="layout-toast" role="status">
          <span>{toast}</span>
          <button type="button" className="layout-toast-dismiss" onClick={() => setToast(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-title">TrendPulse</div>
          <div className="sidebar-brand-tag">Predictive Oracle AI</div>
        </div>

        <nav className="nav-menu">
          <Link to="/dashboard" className={`nav-link ${pathActive(location.pathname, '/dashboard') ? 'active' : ''}`}>
            <span className="material-symbols-outlined nav-icon">dashboard</span>
            Command Center
          </Link>
          <Link to="/trends" className={`nav-link ${pathActive(location.pathname, '/trends') ? 'active' : ''}`}>
            <span className="material-symbols-outlined nav-icon">insights</span>
            Trend Explorer
          </Link>
          <Link to="/opportunities" className={`nav-link ${pathActive(location.pathname, '/opportunities') ? 'active' : ''}`}>
            <span className="material-symbols-outlined nav-icon">monetization_on</span>
            Opportunity Finder
          </Link>
          <Link to="/ai-analyst" className={`nav-link ${pathActive(location.pathname, '/ai-analyst') ? 'active' : ''}`}>
            <span className="material-symbols-outlined nav-icon">auto_awesome</span>
            AI Analyst
          </Link>
          <Link
            to="/reseller-blueprint"
            className={`nav-link ${pathActive(location.pathname, '/reseller-blueprint') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined nav-icon">savings</span>
            Reseller blueprint
          </Link>
        </nav>

        <div className="sidebar-spacer" />

        <Link to="/reseller-blueprint" className="sidebar-cta">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            bolt
          </span>
          Generate blueprint
        </Link>

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-link nav-link--subtle"
            disabled={pipelineMutation.isPending}
            onClick={() => pipelineMutation.mutate()}
          >
            <span className="material-symbols-outlined nav-icon">database</span>
            {pipelineMutation.isPending ? 'Running…' : 'Refresh catalog (pipeline)'}
          </button>
          {token ? (
            <button type="button" className="nav-link nav-link--subtle" onClick={logout}>
              <span className="material-symbols-outlined nav-icon">logout</span>
              Sign out
            </button>
          ) : (
            <Link to="/" className="nav-link nav-link--subtle">
              <span className="material-symbols-outlined nav-icon">login</span>
              Sign in
            </Link>
          )}
          <button type="button" className="nav-link nav-link--subtle">
            <span className="material-symbols-outlined nav-icon">settings</span>
            Settings
          </button>
          <button type="button" className="nav-link nav-link--subtle">
            <span className="material-symbols-outlined nav-icon">help_outline</span>
            Support
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <Link to="/dashboard" className="topbar-wordmark">
              TrendPulse
            </Link>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={20} strokeWidth={2} />
              {alerts.length > 0 ? <span className="badge-dot" /> : null}
            </button>
            <div className="user-avatar" aria-hidden>
              TP
            </div>
          </div>
        </header>
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
