import { useNavigate } from 'react-router-dom';
import { AppTile } from '@multiapp/ui';
import { buildAppPath } from '@multiapp/shared-nav';
import { appRegistry } from '../registry.js';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <h1>Welcome</h1>
      <p className="page__sub">
        Pick an app below, or use the ⠿ launcher in the top bar. Apps shown here come from
        the same registry, filtered by <code>VITE_ENABLED_APPS</code> at build time.
      </p>
      <div className="home-grid">
        {appRegistry.map(({ manifest }) => (
          <AppTile
            key={manifest.id}
            icon={manifest.icon}
            name={manifest.name}
            description={manifest.description}
            color={manifest.color}
            onClick={() => navigate(buildAppPath(manifest.id))}
          />
        ))}
      </div>
    </div>
  );
}
