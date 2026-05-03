const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000';

const AUTH_KEY = 'trendpulse_access_token';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(AUTH_KEY, token);
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

function authHeaders(): Record<string, string> {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function parseError(response: Response): Promise<string> {
  const err = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const d = err.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    const parts = d.map((item) => {
      if (item && typeof item === 'object' && 'msg' in item) {
        return String((item as { msg: string }).msg);
      }
      return typeof item === 'string' ? item : JSON.stringify(item);
    });
    return parts.filter(Boolean).join(' ') || response.statusText || 'Request failed';
  }
  if (d && typeof d === 'object' && 'msg' in d) {
    return String((d as { msg: string }).msg);
  }
  return response.statusText || 'Request failed';
}

export async function login(username: string, password: string): Promise<{ access_token: string; user_id: number }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function registerUser(body: {
  username: string;
  password: string;
  name?: string;
  budget?: number;
}): Promise<{ access_token: string; user_id: number }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function fetchMe(): Promise<{ id: number; username: string | null; name: string | null; budget: number | null }> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`, { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error('Failed to fetch dashboard summary');
  return response.json();
}

export async function fetchTrends(params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${API_BASE_URL}/trends`);
  Object.keys(params).forEach((key) => {
    const v = params[key];
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(key, String(v));
  });
  const response = await fetch(url, { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error('Failed to fetch trends');
  return response.json();
}

export async function fetchTrendDetail(trendId: string | number) {
  const response = await fetch(`${API_BASE_URL}/trends/${trendId}`, { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error('Failed to fetch trend detail');
  return response.json();
}

export async function fetchNotifications(limit = 20) {
  const response = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

export async function fetchOpportunities(budget = 15000, topN = 3) {
  const response = await fetch(
    `${API_BASE_URL}/opportunities/analyze?budget=${budget}&top_n=${topN}`,
    { headers: { ...authHeaders() } }
  );
  if (!response.ok) throw new Error('Failed to fetch opportunities');
  return response.json();
}

export type PipelineRunResult = {
  ok: boolean;
  message: string;
  trend_count?: number | null;
  alert_count?: number | null;
  trends_delta?: number | null;
  alerts_delta?: number | null;
};

export async function runPipeline(): Promise<PipelineRunResult> {
  const response = await fetch(`${API_BASE_URL}/pipeline/run`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to run pipeline');
  return response.json();
}

export async function saveFinderStrategy(
  picks: { trend_id: number; allocation: number; profit_score: number }[]
): Promise<{ ok: boolean; saved: number }> {
  const response = await fetch(`${API_BASE_URL}/users/me/portfolio/strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ picks }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function runIncrementalPipeline() {
  const response = await fetch(`${API_BASE_URL}/pipeline/incremental`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to run incremental pipeline');
  return response.json();
}

export async function ingestMarketSignal(
  payload: {
    source?: string;
    content: string;
    engagement?: number;
    ingestion_channel?: string;
    refresh_pipeline?: boolean;
  },
  ingestToken: string | null = null
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() };
  if (ingestToken) headers['X-Ingest-Token'] = ingestToken;
  const response = await fetch(`${API_BASE_URL}/api/ingest/signal`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function fetchTrendIntelligenceHistory(trendId: string | number, limit = 60) {
  const response = await fetch(
    `${API_BASE_URL}/trends/${trendId}/intelligence-history?limit=${limit}`,
    { headers: { ...authHeaders() } }
  );
  if (!response.ok) throw new Error('Failed to fetch trend intelligence history');
  return response.json();
}

export async function fetchUserRecommendations(userId = 1) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/recommendations`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch recommendations');
  return response.json();
}

export async function fetchTrendDetails(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/trends/${id}`, { headers: { ...authHeaders() } });
  if (!response.ok) throw new Error('Failed to fetch trend details');
  return response.json();
}

export type ResellerBlueprintPayload = {
  keyword: string;
  geo?: string | null;
  include_lazada?: boolean;
};

export async function fetchResellerBlueprint(payload: ResellerBlueprintPayload) {
  const body: Record<string, unknown> = {
    keyword: payload.keyword,
    include_lazada: payload.include_lazada ?? true,
  };
  if (payload.geo != null && String(payload.geo).trim() !== '') {
    body.geo = String(payload.geo).trim();
  }
  const response = await fetch(`${API_BASE_URL}/api/reseller/blueprint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function askAnalyst(question: string, userId: string | number | null = null) {
  const response = await fetch(`${API_BASE_URL}/api/ai-analyst`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      question,
      ...(userId != null && userId !== '' ? { user_id: Number(userId) } : {}),
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}
