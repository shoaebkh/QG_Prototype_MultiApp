import { Link } from 'react-router-dom';

export default function NotFound({ appId }) {
  return (
    <div className="page">
      <h1>App not available</h1>
      <p className="page__sub">
        {appId
          ? <>"{appId}" isn't in this deployment's <code>VITE_ENABLED_APPS</code> list - this is
              exactly what you'd see visiting a sales-only build's URL for the Analytics app.</>
          : 'That page does not exist.'}
      </p>
      <Link to="/">← Back home</Link>
    </div>
  );
}
