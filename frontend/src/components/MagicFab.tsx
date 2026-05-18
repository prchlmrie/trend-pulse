import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/client';
import './MagicFab.css';

export function MagicFab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  /* Dashboard has hot-items strip + briefing CTAs; product detail has its own action bar */
  if (pathname === '/dashboard' || /^\/trends\/[^/]+$/.test(pathname)) return null;
  const { data } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  });

  const top = data?.top_opportunities?.[0];
  const trendId = top?.trend_id;

  const go = () => {
    if (trendId != null) navigate(`/trends/${trendId}`);
    else navigate('/opportunities');
  };

  return (
    <button type="button" className="magic-fab" onClick={go} aria-label="Show me the money — top profit pick">
      <span className="material-symbols-outlined magic-fab-icon" aria-hidden>
        payments
      </span>
      Show me the money
    </button>
  );
}
