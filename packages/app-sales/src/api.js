const BASE_URL = import.meta.env.VITE_SALES_API_URL;

async function unwrap(response, notFoundMessage) {
  if (response.status === 404) throw new Error(notFoundMessage);
  if (!response.ok) throw new Error(`sales-service returned ${response.status}`);
  return response.json();
}

export async function fetchLeads() {
  const res = await fetch(`${BASE_URL}/api/sales/leads`);
  return unwrap(res, 'Leads not found');
}

export async function fetchLead(id) {
  const res = await fetch(`${BASE_URL}/api/sales/leads/${id}`);
  return unwrap(res, `Lead ${id} not found`);
}

export async function convertLead(id) {
  const res = await fetch(`${BASE_URL}/api/sales/leads/${id}/convert`, { method: 'POST' });
  return unwrap(res, `Lead ${id} not found`);
}
