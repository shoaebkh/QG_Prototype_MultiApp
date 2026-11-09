const BASE_URL = import.meta.env.VITE_ANALYTICS_API_URL;

export async function fetchSummary() {
  const res = await fetch(`${BASE_URL}/api/analytics/summary`);
  if (!res.ok) throw new Error(`analytics-service returned ${res.status}`);
  return res.json();
}
