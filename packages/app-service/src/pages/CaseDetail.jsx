import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@multiapp/ui';
import { buildAppPath } from '@multiapp/shared-nav';
import { fetchCase } from '../api.js';

export default function CaseDetail() {
  const { caseId } = useParams();
  const [caseRecord, setCaseRecord] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCase(caseId).then(setCaseRecord).catch((err) => setError(err.message));
  }, [caseId]);

  if (error) return <p className="page__sub">{error}</p>;
  if (!caseRecord) return <p>Loading…</p>;

  return (
    <div className="page">
      <p><Link to="..">← Back to Cases</Link></p>
      <h1>Case {caseRecord.id}</h1>
      <Card>
        <p><strong>Account:</strong> {caseRecord.accountName}</p>
        <p><strong>Originating value:</strong> ${Number(caseRecord.value).toLocaleString()}</p>
        <p>
          <Link to={buildAppPath('sales', `leads/${caseRecord.leadId}`)}>
            ← Jump back to the originating lead in Sales
          </Link>
        </p>
      </Card>
    </div>
  );
}
