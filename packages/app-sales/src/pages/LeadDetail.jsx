import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Card, Badge } from '@multiapp/ui';
import { eventBus } from '@multiapp/event-bus';
import { buildAppPath } from '@multiapp/shared-nav';
import { fetchLead, convertLead } from '../api.js';

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchLead(leadId).then(setLead).catch((err) => setError(err.message));
  }, [leadId]);

  async function handleConvert() {
    setConverting(true);
    try {
      // The real persistence + the real sales-service -> service-service
      // HTTP call both already happened on the server by the time this
      // resolves. The event below is purely a same-session UI nicety -
      // "if something is listening right now, let it react immediately
      // instead of waiting on its own next fetch."
      const result = await convertLead(leadId);
      setCaseId(result.caseId);
      setLead((prev) => ({ ...prev, converted: true }));
      eventBus.emit('lead:converted', result);
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  }

  if (error) return <p className="page__sub">{error}</p>;
  if (!lead) return <p>Loading…</p>;

  return (
    <div className="page">
      <p><Link to="..">← Back to Leads</Link></p>
      <h1>{lead.name} {lead.converted && <Badge tone="info">Case created</Badge>}</h1>
      <Card>
        <p><strong>Stage:</strong> {lead.stage}</p>
        <p><strong>Value:</strong> ${Number(lead.value).toLocaleString()}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button onClick={handleConvert} disabled={lead.converted || converting}>
            {lead.converted ? 'Converted' : converting ? 'Converting…' : 'Convert to Case'}
          </Button>
          {lead.converted && caseId && (
            <Button
              variant="secondary"
              onClick={() => navigate(buildAppPath('service', `cases/${caseId}`))}
            >
              Open Case in Service app →
            </Button>
          )}
        </div>
      </Card>
      <p className="page__sub" style={{ marginTop: 16 }}>
        Clicking "Convert to Case" POSTs to <code>sales-service</code>, which makes its own
        server-to-server HTTP call to <code>service-service</code>. This page never talks to
        service-service directly.
      </p>
    </div>
  );
}
