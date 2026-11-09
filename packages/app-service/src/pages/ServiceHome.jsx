import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '@multiapp/ui';
import { eventBus } from '@multiapp/event-bus';
import { fetchCases } from '../api.js';

export default function ServiceHome() {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchCases().then(setCases).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    // The case row itself was already created server-side by sales-service's
    // call to POST /api/service/cases - this listener doesn't create
    // anything, it just lets an already-open tab react without a refetch.
    const unsubscribe = eventBus.on('lead:converted', (converted) => {
      setToast(`New case from Sales: ${converted.accountName}`);
      setTimeout(() => setToast(null), 3000);
      setCases((prev) => {
        if (!prev || prev.some((c) => c.id === converted.caseId)) return prev;
        return [
          { id: converted.caseId, leadId: converted.leadId, accountName: converted.accountName, value: converted.value },
          ...prev,
        ];
      });
    });
    return unsubscribe;
  }, []);

  if (error) return <p className="page__sub">Couldn't reach service-service: {error}</p>;

  return (
    <div className="page">
      <h1>Service · Cases {cases && <Badge tone="danger">{cases.length}</Badge>}</h1>
      <p className="page__sub">
        Fetched live from <code>service-service</code> at {import.meta.env.VITE_SERVICE_API_URL} -
        refresh this page and the list is still here, because it's a real database now, not
        frontend state.
      </p>
      {toast && <div className="toast">{toast}</div>}
      {!cases && <p>Loading…</p>}
      {cases?.length === 0 && <p>No cases yet. Convert a lead in the Sales app.</p>}
      <div className="list">
        {cases?.map((c) => (
          <Card key={c.id}>
            <div className="list__row">
              <div>
                <strong>{c.accountName}</strong>
                <div className="page__sub">Case {c.id} · from lead {c.leadId}</div>
              </div>
              <Link to={`cases/${c.id}`}>View case →</Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
