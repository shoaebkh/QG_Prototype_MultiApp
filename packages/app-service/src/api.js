const BASE_URL = import.meta.env.VITE_SERVICE_API_URL;

async function unwrap(response, notFoundMessage) {
  if (response.status === 404) throw new Error(notFoundMessage);
  if (!response.ok) throw new Error(`service-service returned ${response.status}`);
  return response.json();
}

export async function fetchCases() {
  const res = await fetch(`${BASE_URL}/api/service/cases`);
  return unwrap(res, 'Cases not found');
}

export async function fetchCase(id) {
  const res = await fetch(`${BASE_URL}/api/service/cases/${id}`);
  return unwrap(res, `Case ${id} not found`);
}
