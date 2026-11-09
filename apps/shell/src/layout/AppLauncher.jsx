import { useNavigate } from 'react-router-dom';
import { AppTile } from '@multiapp/ui';
import { buildAppPath } from '@multiapp/shared-nav';
import { appRegistry } from '../registry.js';

// The Salesforce-style "waffle" grid: pick an app, the shell navigates
// there client-side. Only apps present in the (env-filtered) registry
// ever show up here.
export default function AppLauncher({ onClose }) {
  const navigate = useNavigate();

  function goTo(appId) {
    navigate(buildAppPath(appId));
    onClose();
  }

  return (
    <>
      <div className="launcher-backdrop" onClick={onClose} />
      <div className="launcher">
        <p className="launcher__title">Apps</p>
        <div className="launcher__grid">
          {appRegistry.map(({ manifest }) => (
            <AppTile
              key={manifest.id}
              icon={manifest.icon}
              name={manifest.name}
              description={manifest.description}
              color={manifest.color}
              onClick={() => goTo(manifest.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
