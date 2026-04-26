const API_BASE_URL = 'http://localhost:8000';

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`);
  if (!response.ok) throw new Error('Failed to fetch dashboard summary');
  return response.json();
}

export async function fetchTrends(params = {}) {
  const url = new URL(`${API_BASE_URL}/trends`);
  Object.keys(params).forEach(key => {
    if (params[key]) url.searchParams.append(key, params[key]);
  });
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch trends');
  return response.json();
}

export async function fetchTrendDetail(trendId) {
  const response = await fetch(`${API_BASE_URL}/trends/${trendId}`);
  if (!response.ok) throw new Error('Failed to fetch trend detail');
  return response.json();
}

export async function fetchNotifications(limit = 20) {
  const response = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

export async function fetchOpportunities(budget = 3000, topN = 3) {
  const response = await fetch(`${API_BASE_URL}/opportunities/analyze?budget=${budget}&top_n=${topN}`);
  if (!response.ok) throw new Error('Failed to fetch opportunities');
  return response.json();
}

export async function runPipeline() {
  const response = await fetch(`${API_BASE_URL}/pipeline/run`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to run pipeline');
  return response.json();
}

export async function fetchUserRecommendations(userId = 1) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/recommendations`);
  if (!response.ok) throw new Error('Failed to fetch recommendations');
  return response.json();
}

export async function fetchTrendDetails(id) {
  const response = await fetch(`${API_BASE_URL}/trends/${id}`);
  if (!response.ok) throw new Error('Failed to fetch trend details');
  return response.json();
}
