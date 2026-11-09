import { useEffect, useState } from 'react';
import { Card } from '@multiapp/ui';
import { useShellStore } from '@multiapp/shared-store';
import { fetchSummary } from '../api.js';

export default function AnalyticsHome() {
  const user = useShellStore((s) => s.currentUser);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary().then(setSummary).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <h1>Analytics · Cross-app dashboard</h1>
      <p className="page__sub">
        Nothing here imports Sales or Service code, and nothing here reads another app's
        in-browser state either - this calls <code>analytics-service</code>, which itself calls{' '}
        <code>service-service</code> over HTTP.
      </p>
      {error && <p className="page__sub">Couldn't reach analytics-service: {error}</p>}
      <div className="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Card>
          <div className="page__sub">Signed in as</div>
          <strong>{user.name}</strong>
        </Card>
        <Card>
          <div className="page__sub">Cases created this session</div>
          <strong>{summary ? summary.casesCreated : '…'}</strong>
        </Card>
        <Card>
          <div className="page__sub">Converted pipeline value</div>
          <strong>{summary ? `$${Number(summary.convertedPipelineValue).toLocaleString()}` : '…'}</strong>
        </Card>
      </div>
    </div>
  );
}
