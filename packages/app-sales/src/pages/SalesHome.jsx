import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@multiapp/ui';
import { fetchLeads } from '../api.js';

export default function SalesHome() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeads().then(setLeads).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="page__sub">Couldn't reach sales-service: {error}</p>;
  }

  return (
    <div className="page">
      <h1>Sales · Leads</h1>
      <p className="page__sub">
        Fetched live from <code>sales-service</code> at {import.meta.env.VITE_SALES_API_URL}.
      </p>
      {!leads && <p>Loading…</p>}
      <div className="list">
        {leads?.map((lead) => (
          <Card key={lead.id}>
            <div className="list__row">
              <div>
                <strong>{lead.name}</strong>
                <div className="page__sub">
                  {lead.stage} · ${Number(lead.value).toLocaleString()}
                  {lead.converted && ' · converted'}
                </div>
              </div>
              <Link to={`leads/${lead.id}`}>View lead →</Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
