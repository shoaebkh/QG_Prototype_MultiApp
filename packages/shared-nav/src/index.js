/**
 * Every app builds URLs through this helper instead of hardcoding
 * "/apps/service/..." paths, so the URL scheme for cross-app links lives
 * in exactly one place.
 */
export function buildAppPath(appId, subPath = '') {
  const clean = subPath.startsWith('/') ? subPath.slice(1) : subPath;
  return `/apps/${appId}${clean ? `/${clean}` : ''}`;
}
